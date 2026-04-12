import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "nico@contentking.de";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} existiert bereits (Rolle: ${existing.role})`);
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log(`Rolle auf ADMIN gesetzt.`);
    }
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Nico Sacotte",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log(`Admin-User erstellt: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
