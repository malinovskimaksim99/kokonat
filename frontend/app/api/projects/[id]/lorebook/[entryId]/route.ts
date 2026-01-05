import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    props: { params: Promise<{ id: string; entryId: string }> }
) {
    const params = await props.params;
    const entryId = params.entryId; // Note: Next.js app router params matching file name
    const body = await request.json();

    try {
        const updatedEntry = await prisma.lorebookEntry.update({
            where: { id: entryId },
            data: {
                name: body.name,
                type: body.type,
                description: body.description,
                status: body.status,
            },
        });
        return NextResponse.json(updatedEntry);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string; entryId: string }> }
) {
    const params = await props.params;
    const entryId = params.entryId;

    console.log("🔥 DELETE ENTRY REQUEST:", entryId);

    try {
        await prisma.lorebookEntry.delete({
            where: { id: entryId },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
    }
}
