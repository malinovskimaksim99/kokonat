import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const messages = await prisma.message.findMany({
            where: { projectId: id },
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json(messages);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const { role, content } = body;

        const message = await prisma.message.create({
            data: {
                role,
                content,
                projectId: id
            }
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { messageId, content } = body;

        if (!messageId || !content) {
            return NextResponse.json({ error: 'Missing messageId or content' }, { status: 400 });
        }

        const updatedMessage = await prisma.message.update({
            where: { id: messageId },
            data: { content }
        });

        return NextResponse.json(updatedMessage);
    } catch (error) {
        console.error("Failed to update message:", error);
        return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }
}
