import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  LevelFormat,
  convertInchesToTwip,
} from "docx";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const FONT = "Calibri";

type InlineSegment = { text: string; bold?: boolean; italic?: boolean };

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true, italic: true });
    } else if (match[3]) {
      segments.push({ text: match[3], bold: true });
    } else if (match[4]) {
      segments.push({ text: match[4], italic: true });
    } else if (match[5]) {
      segments.push({ text: match[5], bold: true, italic: true });
    } else if (match[6]) {
      segments.push({ text: match[6], italic: true });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0 && text) {
    segments.push({ text });
  }

  return segments;
}

function makeTextRuns(text: string, baseSize: number, baseColor?: string): TextRun[] {
  return parseInline(text).map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold,
        italics: seg.italic,
        size: baseSize,
        font: FONT,
        ...(baseColor ? { color: baseColor } : {}),
      })
  );
}

function parseTable(lines: string[]): Table {
  const rows = lines
    .filter((l) => !l.match(/^\|[\s:-]+\|$/))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    );

  const isHeader = (idx: number) => idx === 0 && lines.length > 1 && /^[\s|:-]+$/.test(lines[1]);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells, rowIdx) =>
        new TableRow({
          children: cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: makeTextRuns(
                      cell,
                      18,
                      isHeader(rowIdx) ? "1e3a5f" : undefined
                    ),
                    spacing: { before: 40, after: 40 },
                  }),
                ],
                shading: isHeader(rowIdx)
                  ? { fill: "e8edf4", type: "clear" as unknown as undefined }
                  : undefined,
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
              })
          ),
        })
    ),
  });
}

function markdownToDocxElements(md: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(parseTable(tableLines));
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(h1[1], 28),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 120 },
        })
      );
      i++;
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(h2[1], 26),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 260, after: 100 },
        })
      );
      i++;
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(h3[1], 24),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 220, after: 80 },
        })
      );
      i++;
      continue;
    }

    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: h4[1], bold: true, size: 22, font: FONT }),
          ],
          spacing: { before: 200, after: 80 },
        })
      );
      i++;
      continue;
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
      elements.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          spacing: { before: 120, after: 120 },
        })
      );
      i++;
      continue;
    }

    const bullet = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (bullet) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(bullet[1], 21),
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      );
      i++;
      continue;
    }

    const indent2 = line.match(/^[\s]{2,4}[-*+]\s+(.+)$/);
    if (indent2) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(indent2[1], 21),
          bullet: { level: 1 },
          spacing: { after: 40 },
        })
      );
      i++;
      continue;
    }

    const ordered = line.match(/^[\s]*\d+[.)]\s+(.+)$/);
    if (ordered) {
      elements.push(
        new Paragraph({
          children: makeTextRuns(ordered[1], 21),
          numbering: { reference: "ordered-list", level: 0 },
          spacing: { after: 40 },
        })
      );
      i++;
      continue;
    }

    elements.push(
      new Paragraph({
        children: makeTextRuns(line, 21),
        alignment: AlignmentType.LEFT,
        spacing: { after: 80 },
      })
    );
    i++;
  }

  return elements;
}

function buildDocx(messages: ChatMessage[], title: string): Document {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32, font: FONT })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Erstellt am ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
          size: 20,
          color: "888888",
          font: FONT,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
      spacing: { after: 300 },
    })
  );

  for (const msg of messages) {
    const isUser = msg.role === "user";

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: isUser ? "Frage:" : "Analyse:",
            bold: true,
            size: 22,
            color: isUser ? "2563EB" : "059669",
            font: FONT,
          }),
        ],
        spacing: { before: 280, after: 100 },
      })
    );

    if (isUser) {
      children.push(
        new Paragraph({
          children: makeTextRuns(msg.content, 21),
          spacing: { after: 80 },
        })
      );
    } else {
      children.push(...markdownToDocxElements(msg.content));
    }
  }

  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
      spacing: { before: 400, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generiert mit Market Research AI — clever.legal Dashboard",
          size: 18,
          color: "AAAAAA",
          italics: true,
          font: FONT,
        }),
      ],
    })
  );

  return new Document({
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, title } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Keine Nachrichten vorhanden" }, { status: 400 });
  }

  const folder = await prisma.mediaFolder.findFirst({
    where: { name: "08_Market_Research" },
  });

  if (!folder) {
    return NextResponse.json(
      { error: "Ordner '08_Market_Research' nicht gefunden. Bitte zuerst in der Mediathek anlegen." },
      { status: 404 }
    );
  }

  const docTitle = title || "Market Research";
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `${timestamp}_${docTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "").replace(/\s+/g, "_")}.docx`;

  const doc = buildDocx(messages, docTitle);
  const buffer = await Packer.toBuffer(doc);
  const file = new File([buffer], fileName, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const blob = await put(fileName, file, { access: "public", addRandomSuffix: true });

  const mediaFile = await prisma.mediaFile.create({
    data: {
      name: fileName,
      url: blob.url,
      size: buffer.byteLength,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      folderId: folder.id,
      uploadedById: session.user.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(mediaFile, { status: 201 });
}
