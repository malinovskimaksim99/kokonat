import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
    const { ideaId } = await params;
    try {
        const body = await request.json();
        // Support toggling completion or editing content
        const { isCompleted, content } = body;

        const updateData: any = {};
        if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
        if (content !== undefined) updateData.content = content;

        const updatedIdea = await prisma.idea.update({
            where: { id: ideaId },
            data: updateData
        });

        return NextResponse.json(updatedIdea);
    } catch (error) {
        console.error("Failed to update idea", error);
        return NextResponse.json({ error: "Failed to update idea" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; ideaId: string }> }
) {
    const { ideaId } = await params;
    try {
        await prisma.idea.delete({
            where: { id: ideaId }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete idea", error);
        return NextResponse.json({ error: "Failed to delete idea" }, { status: 500 });
    }
}
