import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { chapter_text, bible_text } = body;

        const response = await fetch('http://127.0.0.1:8000/analyze-world-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chapter_text, bible_text }),
        });

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const data = await response.json();
        let updates = [];

        try {
            const json = JSON.parse(data.json_str);
            if (json.updates && Array.isArray(json.updates)) {
                updates = json.updates;
            }
        } catch (e) {
            console.error("Failed to parse JSON from AI", e);
        }

        return NextResponse.json({ updates, raw: data.json_str });
    } catch (error) {
        console.error('Analysis failed:', error);
        return NextResponse.json(
            { error: 'Failed to analyze world updates' },
            { status: 500 }
        );
    }
}
