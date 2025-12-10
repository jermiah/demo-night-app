import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const eventId = process.argv[2] || "sf-demo";
  
  console.log(`Checking Event '${eventId}' for match mode...\n`);

  try {
    // Get the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        oneVsOneMode: true,
        _count: {
          select: {
            matches: true,
          },
        },
      },
    });

    if (!event) {
      console.error(`❌ Event '${eventId}' not found!`);
      process.exit(1);
    }

    console.log("📊 Event Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Name: ${event.name}`);
    console.log(`  ID: ${event.id}`);
    console.log(`  oneVsOneMode: ${event.oneVsOneMode}`);
    console.log(`  Matches: ${event._count.matches}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!event.oneVsOneMode) {
      console.log("⚠️  Match mode is NOT enabled!");
      console.log("\nTo enable match mode, you can:");
      console.log("  1. Create a match (this will auto-enable it)");
      console.log("  2. Run this script with --enable flag");
      console.log("  3. Update manually in Prisma Studio");
      
      if (process.argv.includes("--enable")) {
        console.log("\n🔧 Enabling match mode...");
        await prisma.event.update({
          where: { id: eventId },
          data: { oneVsOneMode: true },
        });
        console.log("✅ Match mode enabled!");
      }
    } else {
      console.log("✅ Match mode is enabled!");
      
      // Check for active matches
      const activeMatches = await prisma.match.findMany({
        where: {
          eventId: eventId,
          isActive: true,
        },
        include: {
          startupA: true,
          startupB: true,
          startupC: true,
        },
      });

      if (activeMatches.length === 0) {
        console.log("\n⚠️  No active matches found.");
        console.log("   Users will see 'No active match' message.");
        console.log("   Create and start a match in the admin panel to enable voting.");
      } else {
        console.log(`\n🔴 Active Matches: ${activeMatches.length}`);
        activeMatches.forEach((match, idx) => {
          console.log(`\n  Match ${idx + 1}:`);
          console.log(`    Round: ${match.roundType ?? "N/A"}`);
          console.log(`    Startup A: ${match.startupA.name}`);
          console.log(`    Startup B: ${match.startupB.name}`);
          if (match.startupC) {
            console.log(`    Startup C: ${match.startupC.name}`);
          }
        });
      }
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      console.error("❌ Error:", error.message);
    } else {
      console.error("❌ Unexpected error:", error);
    }
    process.exit(1);
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });

