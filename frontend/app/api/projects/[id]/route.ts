import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                chapters: true,
                lorebook: true,
                // graphNodes: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const { title, description, content } = body;

        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }), // allow empty string
                ...(content !== undefined && { content }),
            },
        });

        return NextResponse.json(updatedProject);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}
