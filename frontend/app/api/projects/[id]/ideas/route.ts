import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjust based on your actual path, usually relative if inside app

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const ideas = await prisma.idea.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(ideas);
    } catch (error) {
        console.error("Failed to fetch ideas", error);
        return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    try {
        const body = await request.json();
        const { content } = body;

        if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

        const newIdea = await prisma.idea.create({
            data: {
                content,
                projectId
            }
        });

        return NextResponse.json(newIdea);
    } catch (error) {
        console.error("Failed to create idea", error);
        return NextResponse.json({ error: "Failed to create idea" }, { status: 500 });
    }
}
