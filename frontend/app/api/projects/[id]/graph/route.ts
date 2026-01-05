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
                graphNodes: true,
                graphEdges: true
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({
            nodes: project.graphNodes,
            edges: project.graphEdges
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const { nodes, edges } = body;

        // Transaction: Clear old, Insert new
        await prisma.$transaction([
            prisma.graphEdge.deleteMany({ where: { projectId: id } }),
            prisma.graphNode.deleteMany({ where: { projectId: id } }),
            prisma.graphNode.createMany({
                data: nodes.map((n: any) => ({
                    id: n.id,
                    type: n.type || 'default',
                    positionX: n.position.x,
                    positionY: n.position.y,
                    data: JSON.stringify(n.data),
                    projectId: id
                }))
            }),
            prisma.graphEdge.createMany({
                data: edges.map((e: any) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    projectId: id
                }))
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save graph' }, { status: 500 });
    }
}
