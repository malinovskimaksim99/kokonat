import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string, chapterId: string }> }
) {
    try {
        const { chapterId } = await props.params;
        const body = await request.json();
        const { title, content } = body;

        const updatedChapter = await prisma.chapter.update({
            where: { id: chapterId },
            data: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(body.pov !== undefined && { pov: body.pov }),
            }
        });

        return NextResponse.json(updatedChapter);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string, chapterId: string }> }
) {
    try {
        const { chapterId } = await props.params;
        await prisma.chapter.delete({
            where: { id: chapterId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
    }
}
