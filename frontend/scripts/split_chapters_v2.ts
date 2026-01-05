
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true

async function main() {
    console.log(`Running in ${DRY_RUN ? 'DRY RUN' : 'LIVE'} mode.`);

    const project = await prisma.project.findFirst({
        where: { title: { contains: 'Тіні' } },
        include: { chapters: true }
    });

    if (!project) {
        console.log('Project not found');
        return;
    }

    // Get content (either from Chapter 1 or Project legacy content)
    let fullText = "";
    let sourceChapterId = null;

    if (project.chapters.length > 0) {
        // Assuming migration put everything in the first chapter
        fullText = project.chapters[0].content;
        sourceChapterId = project.chapters[0].id;
    } else {
        fullText = project.content || "";
    }

    if (!fullText) {
        console.log("No content to split.");
        return;
    }

    // REGEX Strategy
    // Look for lines starting with "Розділ X" or "Chapter X"
    // Capturing the header and the following text transparently
    const splitRegex = /(?:^|\n)(Розділ\s+\d+|Chapter\s+\d+|Вступ|Пролог)(?:.*)(?:\n|$)/g;

    // We need to split by indexes to keep the text
    const matches = [...fullText.matchAll(splitRegex)];

    if (matches.length === 0) {
        console.log("No chapter headers found matching /Розділ|Chapter/");
        console.log("Preview:", fullText.slice(0, 200));
        return;
    }

    console.log(`Found ${matches.length} potential chapters.`);

    const chaptersToCreate = [];

    // Add "Preamble" if text exists before first match
    if (matches[0].index && matches[0].index > 0) {
        chaptersToCreate.push({
            title: "Вступ / Інформація",
            content: fullText.slice(0, matches[0].index).trim(),
            order: 0
        });
    }

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const start = match.index!;
        const end = (i + 1 < matches.length) ? matches[i + 1].index! : fullText.length;

        const chunk = fullText.slice(start, end).trim();
        // Extract title from first line
        const firstLineEnd = chunk.indexOf('\n');
        const title = chunk.slice(0, firstLineEnd > -1 ? firstLineEnd : undefined).trim();
        // Content is the rest (or keep title in content? User preference. Usually better to keep it to avoid data loss)
        // I will keep the full chunk as content for safety, but maybe duplicate title. 
        // Actually, standard is Title in Tab, Content in Editor. Editor usually contains Title too? 
        // Let's just put full chunk in content.

        console.log(`[Plan] Chapter ${i + 1}: "${title}" (Length: ${chunk.length})`);

        chaptersToCreate.push({
            title: title.substring(0, 50), // Truncate if too long
            content: chunk,
            order: i + 1
        });
    }

    if (!DRY_RUN) {
        console.log("Executing DB changes...");

        // 1. Delete existing chapters
        await prisma.chapter.deleteMany({
            where: { projectId: project.id }
        });
        console.log("Deleted old chapters.");

        // 2. Create new chapters
        for (const ch of chaptersToCreate) {
            await prisma.chapter.create({
                data: {
                    title: ch.title,
                    content: ch.content,
                    order: ch.order,
                    projectId: project.id
                }
            });
        }
        console.log(`Created ${chaptersToCreate.length} new chapters.`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
