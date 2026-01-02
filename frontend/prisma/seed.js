const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.project.count();
    if (count === 0) {
        console.log("Creating default project...");
        await prisma.project.create({
            data: {
                title: "Чернетка №1",
                description: "Мій перший роман з AI."
            }
        });
    } else {
        console.log("Project already exists.");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
