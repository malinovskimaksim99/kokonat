import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const { title } = body;

        // Find max order
        const lastChapter = await prisma.chapter.findFirst({
            where: { projectId: id },
            orderBy: { order: 'desc' }
        });
        const nextOrder = (lastChapter?.order || 0) + 1;

        const chapter = await prisma.chapter.create({
            data: {
                title: title || `Розділ ${nextOrder}`,
                content: "",
                order: nextOrder,
                projectId: id
            }
        });

        return NextResponse.json(chapter);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
    }
}
