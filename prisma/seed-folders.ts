import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type FolderNode = { name: string; children?: FolderNode[] };

const structure: FolderNode[] = [
  {
    name: "01_Gruendung-Gesellschaft",
    children: [
      { name: "Gesellschaftsvertrag" },
      { name: "Handelsregister" },
      { name: "Gesellschafterversammlungen" },
      { name: "Geschaeftsfuehrerbestellung" },
      { name: "Satzungsaenderungen" },
    ],
  },
  {
    name: "02_Buchhaltung-Finanzen",
    children: [
      {
        name: "2025",
        children: [
          { name: "Eingangsrechnungen" },
          { name: "Ausgangsrechnungen" },
          { name: "Kontoauszuege" },
          { name: "Belege-Kasse" },
          { name: "Jahresabschluss" },
        ],
      },
      { name: "Anlagenbuchhaltung" },
    ],
  },
  {
    name: "03_Personal-HR",
    children: [
      { name: "Arbeitsvertraege" },
      { name: "Lohnabrechnung", children: [{ name: "2025" }] },
      { name: "Sozialversicherung" },
      { name: "Bewerbungen" },
      { name: "Zeugnisse" },
      { name: "Krankmeldungen" },
    ],
  },
  {
    name: "04_Vertraege-Rechtliches",
    children: [
      { name: "Kundenvertraege" },
      { name: "Lieferantenvertraege" },
      { name: "Mietvertrag-Buero" },
      { name: "Lizenzvertraege" },
      { name: "NDAs" },
      { name: "Versicherungen" },
    ],
  },
  {
    name: "05_Kunden-Projekte",
    children: [
      {
        name: "_Vorlage-Kundenprojekt",
        children: [
          { name: "Angebot" },
          { name: "Auftrag" },
          { name: "Projektdokumentation" },
          { name: "Korrespondenz" },
          { name: "Abnahme" },
        ],
      },
    ],
  },
  {
    name: "06_Steuern-Abgaben",
    children: [
      {
        name: "2025",
        children: [
          { name: "Umsatzsteuer-Voranmeldungen" },
          { name: "Koerperschaftsteuer" },
          { name: "Gewerbesteuer" },
          { name: "Steuerbescheide" },
        ],
      },
      { name: "Steuerberater-Korrespondenz" },
    ],
  },
  {
    name: "07_Intern-Sonstiges",
    children: [
      {
        name: "Datenschutz-DSGVO",
        children: [
          { name: "Verarbeitungsverzeichnis" },
          { name: "Datenschutzerklaerung" },
        ],
      },
      { name: "AGB-Impressum" },
      { name: "Bankverbindungen" },
      {
        name: "IT-Software",
        children: [
          { name: "Lizenzen" },
          { name: "Zugangsdaten-verschluesselt" },
        ],
      },
      { name: "Zertifikate-Siegel" },
    ],
  },
];

async function createFolders(nodes: FolderNode[], parentId: string | null) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const folder = await prisma.mediaFolder.create({
      data: {
        name: node.name,
        parentId,
        order: i,
      },
    });
    console.log(`  ${"  ".repeat(parentId ? 1 : 0)}📁 ${node.name}`);
    if (node.children) {
      await createFolders(node.children, folder.id);
    }
  }
}

async function main() {
  const existing = await prisma.mediaFolder.count();
  if (existing > 0) {
    console.log(`Es existieren bereits ${existing} Ordner. Überspringe Seed.`);
    console.log("Zum Zurücksetzen erst alle Ordner löschen.");
    return;
  }

  console.log("Erstelle Ordnerstruktur...\n");
  await createFolders(structure, null);
  const total = await prisma.mediaFolder.count();
  console.log(`\n✅ ${total} Ordner erstellt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
