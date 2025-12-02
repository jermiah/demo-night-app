import { PrismaClient } from "@prisma/client";
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const eventId = "sf-demo";
    let output = `Checking for event: ${eventId}\n`;

    // Check ALL demos
    const allDemos = await prisma.demo.findMany({});
    output += `Total demos in DB: ${allDemos.length}\n`;
    output += "All Demos:\n" + JSON.stringify(allDemos.map(d => ({ id: d.id, name: d.name, eventId: d.eventId, index: d.index, votable: d.votable })), null, 2) + "\n";

    // Check matches
    const matches = await prisma.match.findMany({
        where: { eventId },
    });

    output += `Found ${matches.length} matches for event ${eventId}\n`;

    fs.writeFileSync('check_output.txt', output);
    console.log('Output written to check_output.txt');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
