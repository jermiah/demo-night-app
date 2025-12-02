import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Debugging demo creation...");

    const eventId = "sf-demo";
    const demoId = "demo-1";

    // Check if it exists first
    const existing = await prisma.demo.findUnique({ where: { id: demoId } });
    console.log(`Existing demo-1: ${existing ? 'Found' : 'Not Found'}`);

    // Try to upsert
    console.log("Upserting demo-1...");
    const result = await prisma.demo.upsert({
        where: { id: demoId },
        update: {
            name: 'AI Chatbot Pro (Updated)',
            eventId: eventId,
        },
        create: {
            id: demoId,
            eventId: eventId,
            index: 1,
            name: 'AI Chatbot Pro',
            description: 'Debug created',
            votable: true,
        },
    });
    console.log("Upsert result:", result);

    // Verify immediately
    const verify = await prisma.demo.findUnique({ where: { id: demoId } });
    console.log(`Verification demo-1: ${verify ? 'Found' : 'Not Found'}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
