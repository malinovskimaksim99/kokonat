import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const projectId = params.id;

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    const whereClause: any = { projectId };
    if (typeFilter && typeFilter !== 'ALL') {
        whereClause.type = typeFilter;
    }

    const entries = await prisma.lorebookEntry.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(entries);
}

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const projectId = params.id;
    const body = await request.json();

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    try {
        const entry = await prisma.lorebookEntry.create({
            data: {
                name: body.name,
                type: body.type, // CHARACTER, LOCATION, etc.
                description: body.description,
                status: body.status || "Active",
                projectId: projectId
            }
        });
        return NextResponse.json(entry);
    } catch (e) {
        console.error("Failed to create lorebook entry", e);
        return NextResponse.json({ error: "Creation failed" }, { status: 500 });
    }
}
