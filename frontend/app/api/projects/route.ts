import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(projects);
}

export async function POST(request: Request) {
    const body = await request.json();
    const project = await prisma.project.create({
        data: {
            title: body.title || "Новий Проект",
            description: body.description || ""
        }
    });
    return NextResponse.json(project);
}
