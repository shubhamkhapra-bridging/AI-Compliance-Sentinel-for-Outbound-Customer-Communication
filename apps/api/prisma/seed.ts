import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // ── Roles ────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      isSystemRole: true,
      permissions: {
        users: ["read", "write", "delete"],
        emails: ["read", "write", "send", "approve"],
        campaigns: ["read", "write", "launch"],
        analytics: ["read"],
      },
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "manager" },
    update: {},
    create: {
      name: "manager",
      isSystemRole: true,
      permissions: {
        emails: ["read", "write", "approve"],
        campaigns: ["read", "write"],
        analytics: ["read"],
      },
    },
  });

  const senderRole = await prisma.role.upsert({
    where: { name: "sender" },
    update: {},
    create: {
      name: "sender",
      isSystemRole: true,
      permissions: {
        emails: ["read", "write", "send"],
        campaigns: ["read"],
      },
    },
  });

  // ── Products ─────────────────────────────────────────────────────
  const products = [
    { slug: "denefits",      name: "Denefits",      sendingDomain: "mail.denefits.com" },
    { slug: "practina",      name: "Practina",      sendingDomain: "mail.practina.com" },
    { slug: "lendee",        name: "Lendee",        sendingDomain: "mail.lendee.com" },
    { slug: "coolcredit",    name: "CoolCredit",    sendingDomain: "mail.coolcredit.com" },
    { slug: "credee",        name: "Credee",        sendingDomain: "mail.credee.com" },
    { slug: "financemutual", name: "FinanceMutual", sendingDomain: "mail.financemutual.com" },
    { slug: "recuvery",      name: "Recuvery",      sendingDomain: "mail.recuvery.com" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  // ── Users ────────────────────────────────────────────────────────
  const users = [
    {
      email: "admin@bridgingtech.com",
      fullName: "Admin User",
      password: "Admin@123456",
      role: adminRole,
    },
    {
      email: "manager@bridgingtech.com",
      fullName: "Manager User",
      password: "Manager@123456",
      role: managerRole,
    },
    {
      email: "sender@bridgingtech.com",
      fullName: "Sender User",
      password: "Sender@123456",
      role: senderRole,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        active: true,
      },
    });

    // Assign role
    await prisma.userRole.upsert({
      where: {
        // composite unique not defined in schema, so delete+create
        id: `${user.id}-${u.role.id}`,
      },
      update: {},
      create: {
        id: `${user.id}-${u.role.id}`,
        userId: user.id,
        roleId: u.role.id,
        scopeType: "global",
      },
    });

    console.log(`  ✓ ${u.email}  /  ${u.password}`);
  }

  // ── Risk Rules (defaults) ────────────────────────────────────────
  await prisma.riskRule.upsert({
    where: { id: "risk-rule-low" },
    update: {},
    create: {
      id: "risk-rule-low",
      name: "Low Risk — auto send",
      conditions: { maxScore: 30 },
      action: "auto_send",
      priority: 10,
    },
  });

  await prisma.riskRule.upsert({
    where: { id: "risk-rule-medium" },
    update: {},
    create: {
      id: "risk-rule-medium",
      name: "Medium Risk — peer review",
      conditions: { minScore: 31, maxScore: 70 },
      action: "peer_review",
      priority: 20,
    },
  });

  await prisma.riskRule.upsert({
    where: { id: "risk-rule-high" },
    update: {},
    create: {
      id: "risk-rule-high",
      name: "High Risk — manager approval",
      conditions: { minScore: 71 },
      action: "manager_approval",
      priority: 30,
    },
  });

  console.log("\nSeed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
