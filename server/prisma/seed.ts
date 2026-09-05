import { getPrisma } from "../src/prisma.js";

const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${CATEGORY_NAMES.length} categories.`);

  await seedRequesters();
  await seedRelatedSystems();
}

const REQUESTER_SEED = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
  { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
  { name: "David Lee", email: "david.lee@example.com", isActive: true },
  { name: "Former Employee", email: "former.employee@example.com", isActive: false },
];

async function seedRequesters() {
  const prisma = getPrisma();
  for (const r of REQUESTER_SEED) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }
  console.log(`Seeded ${REQUESTER_SEED.length} requesters.`);
}

const RELATED_SYSTEM_NAMES = [
  "Email",
  "Campus Wi-Fi",
  "VPN",
  "LEB2 App",
  "Grade Submission App",
  "Printer",
  "Corporate Laptop",
];

async function seedRelatedSystems() {
  const prisma = getPrisma();
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${RELATED_SYSTEM_NAMES.length} related systems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

  