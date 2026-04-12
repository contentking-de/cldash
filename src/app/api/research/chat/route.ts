import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.Anthropic_API_Key,
});

const SYSTEM_PROMPT = `Du bist ein erfahrener Marktforschungs-Analyst für die Rechtsbranche (LegalTech). 
Du hilfst bei:
- Marktanalysen und Wettbewerbsrecherchen
- Identifikation von Markttrends und -chancen
- Zielgruppenanalysen
- SWOT-Analysen
- Bewertung von Geschäftsmodellen und Marktstrategien

Antworte strukturiert, datengetrieben und praxisorientiert. Nutze Tabellen und Listen wo sinnvoll.
Wenn du Daten nicht sicher weißt, sage das ehrlich und markiere Schätzungen als solche.
Antworte auf Deutsch, es sei denn der Nutzer schreibt auf Englisch.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "Messages array required" }, { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
