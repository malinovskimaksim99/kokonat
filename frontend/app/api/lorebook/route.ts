import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const entries = await prisma.lorebookEntry.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(entries);
}

export async function POST(request: Request) {
    const body = await request.json();

    const entry = await prisma.lorebookEntry.create({
        data: {
            name: body.name,
            type: body.type, // CHARACTER, LOCATION, etc.
            description: body.description,
            status: body.status || "Active",
            projectId: body.projectId
        }
    });

    return NextResponse.json(entry);
}
