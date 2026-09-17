import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcrypt";

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

  await seedUsers();
  await seedRelatedSystems();
}


const SEED_PASSWORD = "ChangeMe123!";

const USER_SEED = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER" as const, isActive: true },
  { name: "Michael Brown", email: "michael.brown@example.com", role: "REQUESTER" as const, isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: "REQUESTER" as const, isActive: true },
  { name: "David Lee", email: "david.lee@example.com", role: "REQUESTER" as const, isActive: true },
  { name: "Former Employee", email: "former.employee@example.com", role: "REQUESTER" as const, isActive: false },

  { name: "Kevin Patel", email: "kevin.patel@example.com", role: "IT_STAFF" as const, isActive: true },
  { name: "Lisa Martinez", email: "lisa.martinez@example.com", role: "IT_STAFF" as const, isActive: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", role: "IT_STAFF" as const, isActive: true },
  { name: "Inactive Staff", email: "inactive.staff@example.com", role: "IT_STAFF" as const, isActive: false },

  { name: "Admin User", email: "admin@example.com", role: "ADMINISTRATOR" as const, isActive: true },
];

async function seedUsers() {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const u of USER_SEED) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash, mustChangePassword: false },
    });
  }
  console.log(`Seeded ${USER_SEED.length} users. Local dev password for all: "${SEED_PASSWORD}"`);
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

  