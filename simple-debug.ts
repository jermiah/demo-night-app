
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting simple match creation debug...");

    try {
        const event = await prisma.event.findUnique({
            where: { id: "sf-demo" },
            include: { demos: true }
        });

        if (!event) {
            console.error("Event 'sf-demo' not found.");
            return;
        }
        console.log(`Found event: ${event.name}`);

        const [startupA, startupB, startupC] = event.demos;

        if (!startupA || !startupB) {
            console.error("Not enough demos to create a match.");
            return;
        }

        console.log(
            `Creating match with: ${startupA.name}, ${startupB.name}${
                startupC ? `, ${startupC.name}` : ""
            }`,
        );

        const match = await prisma.match.create({
            data: {
                eventId: event.id,
                startupAId: startupA.id,
                startupBId: startupB.id,
                startupCId: startupC?.id ?? null,
                roundType: "Final",
                votingWindow: 300,
            }
        });

        console.log("Match created successfully:", match.id);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
