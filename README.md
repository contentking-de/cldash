# clever.legal Admin Dashboard

Internes Admin-Dashboard der clever.legal GmbH.

## Tech-Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Prisma** + Neon PostgreSQL
- **NextAuth.js v5** (Magic Link Auth)
- **Resend** (Email-Benachrichtigungen)

## Features

- Kanban-Board fuer Task-Management (Drag & Drop)
- Ticketsystem (Bugs, Features, Ideen)
- Nutzerverwaltung mit Rollen (Admin/Member)
- Email-Benachrichtigungen bei neuen Tasks und Kommentaren
- Magic-Link-Authentifizierung

## Setup

```bash
# Dependencies installieren
npm install

# .env-Datei erstellen
cp .env.example .env
# Dann die Werte in .env eintragen

# Prisma Client generieren
npx prisma generate

# Datenbank-Migration ausfuehren
npx prisma db push

# Entwicklungsserver starten
npm run dev
```

## Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL Connection String |
| `NEXTAUTH_SECRET` | Random Secret fuer NextAuth |
| `NEXTAUTH_URL` | App URL (z.B. https://admin.clever.legal) |
| `RESEND_API_KEY` | Resend API Key |
| `RESEND_FROM_EMAIL` | Absender-Email (z.B. noreply@clever.legal) |

## Erster Admin-User

Nach dem ersten Login wird ein User mit der Rolle `MEMBER` erstellt. Um den ersten Admin zu setzen:

```bash
npx prisma studio
```

Dort den User auf `ADMIN` setzen.
