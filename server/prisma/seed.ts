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
  await seedTicketsAndActions();
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
      update: { isActive: u.isActive, role: u.role },
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

async function seedTicketsAndActions() {
  const prisma = getPrisma();

  const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.anderson@example.com" } });
  const david = await prisma.user.findUnique({ where: { email: "david.lee@example.com" } });
  const kevin = await prisma.user.findUnique({ where: { email: "kevin.patel@example.com" } });
  const lisa = await prisma.user.findUnique({ where: { email: "lisa.martinez@example.com" } });
  const robert = await prisma.user.findUnique({ where: { email: "robert.wilson@example.com" } });

  const catHw = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catNet = await prisma.category.findUnique({ where: { name: "Network" } });
  const catSw = await prisma.category.findUnique({ where: { name: "Software" } });
  const catAcc = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const sysVpn = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const sysPrinter = await prisma.relatedSystem.findUnique({ where: { name: "Printer" } });
  const sysLeb2 = await prisma.relatedSystem.findUnique({ where: { name: "LEB2 App" } });
  const sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const sysWifi = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const sysGrade = await prisma.relatedSystem.findUnique({ where: { name: "Grade Submission App" } });

  if (!jennifer || !david || !kevin || !lisa || !robert || !catHw || !catNet || !catSw || !catAcc || !sysLaptop) {
    console.warn("Prerequisites missing for seeding tickets.");
    return;
  }

  const TICKETS_DATA = [
    {
      ticketNumber: "TKT-2026-000001",
      requesterId: jennifer.id,
      ticketOwnerId: kevin.id,
      categoryId: catHw.id,
      relatedSystemId: sysLaptop.id,
      summary: "Laptop battery drains quickly",
      description: "Battery discharges from 100% to 10% in under 45 minutes under normal office use.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      actions: [
        {
          performedById: kevin.id,
          actionDateTime: new Date("2026-10-22T09:00:00Z"),
          description: "Ran battery diagnostics and health telemetry inspection.",
          result: "Battery health reported at 38% maximum remaining capacity.",
          followUpRequired: true,
          followUpNote: "Order replacement battery pack and schedule pickup.",
          attachmentNotes: "battery_report.log",
        },
        {
          performedById: lisa.id,
          actionDateTime: new Date("2026-10-22T14:30:00Z"),
          description: "Ordered OEM replacement battery from certified vendor.",
          result: "Order placed, expected arrival in 2 business days.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000002",
      requesterId: jennifer.id,
      ticketOwnerId: lisa.id,
      categoryId: catNet.id,
      relatedSystemId: (sysVpn || sysLaptop).id,
      summary: "VPN disconnects randomly",
      description: "Connection drops every 15-20 minutes when working remotely.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
      actions: [
        {
          performedById: lisa.id,
          actionDateTime: new Date("2026-10-23T08:15:00Z"),
          description: "Checked VPN gateway logs and updated MTU size profile.",
          result: "Configured MTU 1350 and re-authenticated client.",
          followUpRequired: true,
          followUpNote: "Awaiting user confirmation of stability over remote session.",
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000003",
      requesterId: jennifer.id,
      ticketOwnerId: kevin.id,
      categoryId: catHw.id,
      relatedSystemId: (sysPrinter || sysLaptop).id,
      summary: "Printer keeps showing offline",
      description: "Office 3rd floor printer appears offline on Windows workstation.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "OPEN" as const,
      actions: [],
    },
    {
      ticketNumber: "TKT-2026-000004",
      requesterId: jennifer.id,
      ticketOwnerId: robert.id,
      categoryId: catSw.id,
      relatedSystemId: (sysLeb2 || sysLaptop).id,
      summary: "Grade export fails with 500 error",
      description: "Exporting final grades to CSV causes server timeout.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Resolved after backend query optimization and index addition.",
      actions: [
        {
          performedById: robert.id,
          actionDateTime: new Date("2026-10-21T10:00:00Z"),
          description: "Analyzed database slow query logs during export action.",
          result: "Discovered unindexed join on submission records.",
          followUpRequired: true,
          followUpNote: "Apply schema index patch in staging.",
          attachmentNotes: "query_plan.txt",
        },
        {
          performedById: robert.id,
          actionDateTime: new Date("2026-10-21T16:00:00Z"),
          description: "Deployed index migration and verified export.",
          result: "Export completed in 1.2s without errors.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000005",
      requesterId: jennifer.id,
      ticketOwnerId: kevin.id,
      categoryId: catAcc.id,
      relatedSystemId: (sysEmail || sysLaptop).id,
      summary: "Email mailbox quota exceeded",
      description: "Cannot receive incoming messages due to quota limit.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "CLOSED" as const,
      resolutionSummary: "Archived older attachments and expanded quota by 5GB.",
      actions: [
        {
          performedById: kevin.id,
          actionDateTime: new Date("2026-10-19T11:00:00Z"),
          description: "Archived messages older than 2 years to secondary store.",
          result: "Freed up 8.2 GB of mailbox capacity.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000006",
      requesterId: david.id,
      ticketOwnerId: null,
      categoryId: catNet.id,
      relatedSystemId: (sysWifi || sysLaptop).id,
      summary: "Intermittent Wi-Fi drops in Room 402",
      description: "Signal level drops to zero when walking near the window.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "NEW" as const,
      actions: [],
    },
    {
      ticketNumber: "TKT-2026-000007",
      requesterId: david.id,
      ticketOwnerId: lisa.id,
      categoryId: catSw.id,
      relatedSystemId: (sysGrade || sysLaptop).id,
      summary: "Grade Submission App session expires too quickly",
      description: "Session times out after only 5 minutes of inactivity.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "REOPENED" as const,
      actions: [
        {
          performedById: lisa.id,
          actionDateTime: new Date("2026-10-20T13:00:00Z"),
          description: "Adjusted session maxAge setting to 30 minutes.",
          result: "User reported timeout still occurring after browser sleep.",
          followUpRequired: true,
          followUpNote: "Investigate token refresh handling.",
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000008",
      requesterId: david.id,
      ticketOwnerId: null,
      categoryId: catHw.id,
      relatedSystemId: sysLaptop.id,
      summary: "Broken display hinge on laptop",
      description: "User opened ticket by mistake before warranty service.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "CANCELLED" as const,
      actions: [],
    },
  ];

  for (const t of TICKETS_DATA) {
    const { actions, ...ticketFields } = t;
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {},
      create: ticketFields,
    });

    if (actions.length > 0) {
      const existingCount = await prisma.actionTaken.count({
        where: { ticketId: ticket.id },
      });
      if (existingCount === 0) {
        for (const act of actions) {
          await prisma.actionTaken.create({
            data: {
              ticketId: ticket.id,
              ...act,
            },
          });
        }
      }
    }
  }

  console.log(`Seeded ${TICKETS_DATA.length} tickets and their associated Actions Taken.`);
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

