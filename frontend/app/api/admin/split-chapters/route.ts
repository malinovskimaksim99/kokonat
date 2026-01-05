import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { projectId, dryRun } = await request.json();

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { chapters: true }
        });

        if (!project) return NextResponse.json({ error: 'Project not found' });

        let fullText = "";
        if (project.chapters.length > 0) {
            fullText = project.chapters[0].content;
        } else {
            fullText = project.content || "";
        }

        if (!fullText) return NextResponse.json({ error: 'No content' });

        // Regex for 'Розділ X' or 'Chapter X' inside HTML P tags or start of string
        // Matches: <p>Розділ 1, or start of text Розділ 1
        const splitRegex = /(?:<p>|^)(Розділ\s+\d+|Chapter\s+\d+|Вступ|Пролог)(?:<br>|<\/p>|:|\.| )/g;

        let matches = [];
        let match;
        while ((match = splitRegex.exec(fullText)) !== null) {
            matches.push({ index: match.index, title: match[0].trim() });
        }

        if (matches.length === 0) {
            return NextResponse.json({ message: 'No chapters found', textPreview: fullText.slice(0, 100) });
        }

        const chaptersToCreate = [];
        // Preamble
        if (matches[0].index > 0) {
            chaptersToCreate.push({
                title: "Вступ",
                content: fullText.slice(0, matches[0].index).trim(),
                order: 0
            });
        }

        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = (i + 1 < matches.length) ? matches[i + 1].index : fullText.length;
            const chunk = fullText.slice(start, end).trim();
            // Extract title cleanly
            const lines = chunk.split('\n');
            let rawTitle = lines[0].trim();
            if (rawTitle.length > 100) rawTitle = rawTitle.substring(0, 100);

            // Remove any HTML tags
            const titleClean = rawTitle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

            chaptersToCreate.push({
                title: titleClean || `Розділ ${i + 1}`,
                content: chunk,
                order: i + 1
            });
        }

        if (dryRun) {
            return NextResponse.json({
                mode: 'DRY RUN',
                found: chaptersToCreate.map(c => c.title)
            });
        }

        // Execute Split
        await prisma.chapter.deleteMany({ where: { projectId } });

        for (const ch of chaptersToCreate) {
            await prisma.chapter.create({
                data: {
                    title: ch.title,
                    content: ch.content,
                    order: ch.order,
                    projectId: projectId
                }
            });
        }

        return NextResponse.json({ success: true, chaptersCreated: chaptersToCreate.length });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
