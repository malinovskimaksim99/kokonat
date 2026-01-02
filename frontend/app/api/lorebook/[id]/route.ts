import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    const body = await request.json();

    try {
        const updatedEntry = await prisma.lorebookEntry.update({
            where: { id },
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
    { params }: { params: { id: string } }
) {
    const id = params.id;

    try {
        await prisma.lorebookEntry.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
    }
}
