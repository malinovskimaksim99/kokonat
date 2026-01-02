import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Start seeding full manuscript...');

    const parts = [
        'manuscript_part_1.txt',
        'manuscript_part_2.txt',
        'manuscript_part_3.txt',
        'manuscript_part_4.txt',
        'manuscript_part_5.txt',
        'manuscript_part_6.txt',
        'manuscript_part_7.txt',
        'manuscript_part_8.txt',
    ];

    let fullContent = '';

    for (const part of parts) {
        const filePath = path.join(__dirname, part);
        if (fs.existsSync(filePath)) {
            console.log(`Reading ${part}...`);
            const content = fs.readFileSync(filePath, 'utf-8');
            fullContent += content + '\n\n'; // Add spacing between parts
        } else {
            console.warn(`Warning: ${part} not found. Skipping.`);
        }
    }

    // Convert newlines to HTML breaks for basic display (if needed by frontend, though Tiptap handles HTML)
    // Actually, Tiptap prefers HTML.
    // Let's wrap paragraphs in <p> tags for better Tiptap compatibility.
    // Simple split by double newline.
    const paragraphs = fullContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const htmlContent = paragraphs.map(p => {
        // Check if it's a header
        const trimmed = p.trim();
        if (trimmed.startsWith('# ')) {
            return `<h1>${trimmed.substring(2)}</h1>`;
        }
        if (trimmed.startsWith('## ')) {
            return `<h2>${trimmed.substring(3)}</h2>`;
        }
        if (trimmed.startsWith('### ')) {
            return `<h3>${trimmed.substring(4)}</h3>`;
        }
        // Basic text
        // Replace single newlines with <br> inside paragraph if desired, or just space.
        // Usually manuscript text has single newlines for separate lines in dialog?
        // Let's keep it simple: just wrap in <p>.
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    console.log(`Total content length: ${htmlContent.length} characters.`);

    // Find the first project or create one
    const project = await prisma.project.findFirst();

    if (project) {
        console.log(`Updating project: ${project.title} (${project.id})`);
        await prisma.project.update({
            where: { id: project.id },
            data: {
                content: htmlContent,
            },
        });
    } else {
        console.log('No project found. Creating a new one.');
        await prisma.project.create({
            data: {
                title: 'Нова Книга',
                content: htmlContent,
            },
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
