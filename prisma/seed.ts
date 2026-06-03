import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();

function hash(password: string) {
  const salt = process.env.AUTH_SECRET ?? "nimbus";
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

async function main() {
  const email = "demo@nimbus.ai";
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash: hash("password123"),
      credits: 500,
    },
  });
  console.log(`Seeded demo user: ${user.email} / password123 (${user.credits} credits)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
