import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const eventId = "sf-demo";

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    console.error(`❌ Event "${eventId}" not found. Please run seed first.`);
    process.exit(1);
  }

  // Test Audience Members
  const audienceMembers = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      type: "AUDIENCE" as const,
    },
    {
      name: "Bob Smith",
      email: "bob@example.com",
      type: "AUDIENCE" as const,
    },
    {
      name: "Carol Williams",
      email: "carol@example.com",
      type: "AUDIENCE" as const,
    },
  ];

  // Test Judges
  const judges = [
    {
      name: "Judge Sarah Chen",
      email: "judge.sarah@example.com",
      type: "JUDGE" as const,
    },
    {
      name: "Judge Michael Park",
      email: "judge.michael@example.com",
      type: "JUDGE" as const,
    },
  ];

  console.log("Creating test voters...\n");

  // Create Audience Members
  for (const member of audienceMembers) {
    // Check if attendee already exists by email for this event
    const existing = await prisma.attendee.findFirst({
      where: {
        email: member.email,
        events: { some: { id: eventId } },
      },
    });

    let attendee;
    if (existing) {
      // Update existing attendee
      attendee = await prisma.attendee.update({
        where: { id: existing.id },
        data: {
          name: member.name,
          type: member.type,
          events: {
            connect: { id: eventId },
          },
        },
      });
    } else {
      // Create new attendee
      attendee = await prisma.attendee.create({
        data: {
          name: member.name,
          email: member.email,
          type: member.type,
          events: {
            connect: { id: eventId },
          },
        },
      });
    }
    console.log(`✅ Audience: ${attendee.name} (${attendee.email})`);
  }

  // Create Judges
  for (const judge of judges) {
    // Check if attendee already exists by email for this event
    const existing = await prisma.attendee.findFirst({
      where: {
        email: judge.email,
        events: { some: { id: eventId } },
      },
    });

    let attendee;
    if (existing) {
      // Update existing attendee
      attendee = await prisma.attendee.update({
        where: { id: existing.id },
        data: {
          name: judge.name,
          type: judge.type,
          events: {
            connect: { id: eventId },
          },
        },
      });
    } else {
      // Create new attendee
      attendee = await prisma.attendee.create({
        data: {
          name: judge.name,
          email: judge.email,
          type: judge.type,
          events: {
            connect: { id: eventId },
          },
        },
      });
    }
    console.log(`✅ Judge: ${attendee.name} (${attendee.email})`);
  }

  console.log("\n🎉 Test voters created successfully!");
  console.log("\n📝 Login Instructions:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n👥 AUDIENCE MEMBERS:");
  audienceMembers.forEach((m) => {
    console.log(`   • ${m.name}`);
    console.log(`     Email: ${m.email}`);
    console.log(`     Login: http://localhost:3000/login/audience`);
    console.log("");
  });

  console.log("⚖️  JUDGES:");
  judges.forEach((j) => {
    console.log(`   • ${j.name}`);
    console.log(`     Email: ${j.email}`);
    console.log(`     Login: http://localhost:3000/login/judge`);
    console.log("");
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Tip: Use the name and email above to login via the forms.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

