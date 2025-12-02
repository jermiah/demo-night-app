import { db } from "./src/server/db";

async function main() {
    const event = await db.event.findUnique({
        where: { id: "sf-demo" },
    });
    console.log("Event sf-demo:", event);

    const allEvents = await db.event.findMany();
    console.log("All events:", allEvents.map(e => e.id));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
