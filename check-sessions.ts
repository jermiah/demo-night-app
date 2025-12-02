import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.session.findMany({
        include: { user: true },
    });
    console.log("Total Sessions:", sessions.length);
    sessions.forEach((s) => {
        console.log(`- Session ID: ${s.id}, User: ${s.user.email}, Expires: ${s.expires}`);
    });

    const users = await prisma.user.findMany();
    console.log("\nTotal Users:", users.length);
    users.forEach((u) => {
        console.log(`- User: ${u.email}, ID: ${u.id}`);
    });
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
