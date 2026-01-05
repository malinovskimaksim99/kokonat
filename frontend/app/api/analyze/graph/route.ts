import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { chapter_text, existing_nodes_summary } = body;

        const response = await fetch('http://127.0.0.1:8000/analyze-graph-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chapter_text,
                existing_nodes_summary: existing_nodes_summary || ""
            }),
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        let newNodes = [];

        try {
            const json = JSON.parse(data.json_str);
            if (json.newNodes && Array.isArray(json.newNodes)) {
                newNodes = json.newNodes;
            }
        } catch (e) {
            console.error("Failed to parse JSON from AI", e);
        }

        return NextResponse.json({ newNodes, raw: data.json_str });
    } catch (error) {
        console.error('Graph analysis failed:', error);
        return NextResponse.json(
            { error: 'Failed to analyze graph updates' },
            { status: 500 }
        );
    }
}
