
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const PROJECT_ID = "113c8fe7-ecc8-43b3-8d21-3abc20cfec9b"; // Shadows of Ether

async function main() {
    console.log(`Clearing content for project: ${PROJECT_ID}`);

    // 1. Delete all chapters
    const { count } = await prisma.chapter.deleteMany({
        where: { projectId: PROJECT_ID }
    });
    console.log(`Deleted ${count} chapters.`);

    // 2. Clear legacy content
    await prisma.project.update({
        where: { id: PROJECT_ID },
        data: { content: "" }
    });
    console.log("Cleared legacy project content.");

    // 3. Create one empty chapter to start fresh
    await prisma.chapter.create({
        data: {
            title: "Розділ 1",
            content: "",
            order: 1,
            projectId: PROJECT_ID
        }
    });
    console.log("Created fresh empty Chapter 1.");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
