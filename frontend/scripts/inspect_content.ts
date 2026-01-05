
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findFirst({
        where: { title: { contains: 'Тіні' } }, // Fuzzy match "Тіні Ефіру"
        include: { chapters: true }
    });

    if (!project) {
        console.log('Project NOT found');
        return;
    }

    console.log(`Project: ${project.title}`);

    // Check if we have the monolithic chapter
    const chapters = project.chapters;
    if (chapters.length === 0) {
        console.log('No chapters found.');
        return;
    }

    const content = chapters[0].content; // Assuming migrated to Chapter 1
    console.log('--- Content Preview ---');
    console.log(content.slice(0, 500));

    console.log('--- Potential Headers ---');
    // Match lines that usually look like headers
    const matches = content.match(/^(.{0,20}(?:Розділ|Chapter|Глава).{0,50})$/gm);
    if (matches) {
        console.log(matches.slice(0, 15)); // Show first 15 matches
    } else {
        console.log("No explicit 'Розділ' headers found.");
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
