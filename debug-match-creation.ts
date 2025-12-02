
import { db } from "./src/server/db";

async function main() {
    console.log("Starting match creation debug script...");

    try {
        // 1. Get Event
        const event = await db.event.findFirst({
            where: { slug: "sf-demo" },
            include: { demos: true }
        });

        if (!event) {
            console.error("Event 'sf-demo' not found.");
            return;
        }
        console.log(`Found event: ${event.name} (${event.id})`);

        if (event.demos.length < 2) {
            console.error("Not enough demos to create a match.");
            return;
        }

        const startupA = event.demos[0];
        const startupB = event.demos[1];
        const startupC = event.demos[2]; // Might be undefined

        console.log(`Startup A: ${startupA.name} (${startupA.id})`);
        console.log(`Startup B: ${startupB.name} (${startupB.id})`);

        // 2. Create Match
        console.log("Attempting to create match...");
        const match = await db.match.create({
            data: {
                eventId: event.id,
                startupAId: startupA.id,
                startupBId: startupB.id,
                startupCId: startupC?.id, // Optional
                roundType: "Debug Round",
                votingWindow: 300,
            },
            include: {
                startupA: true,
                startupB: true,
                startupC: true,
            }
        });

        console.log("Match created successfully!");
        console.log(JSON.stringify(match, null, 2));

        // 3. Verify Persistence
        const fetchedMatch = await db.match.findUnique({
            where: { id: match.id }
        });

        if (fetchedMatch) {
            console.log("Match verified in database.");
        } else {
            console.error("Match NOT found in database after creation!");
        }

    } catch (error) {
        console.error("Error creating match:", error);
    }
}

main();
