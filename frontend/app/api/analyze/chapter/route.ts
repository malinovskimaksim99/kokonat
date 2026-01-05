import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        const response = await fetch("http://localhost:8000/analyze-chapter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FastAPI Error: ${errorText}`);
        }

        const data = await response.json();
        // data.json_str is the clean JSON string
        // We parse it here to ensure it's valid JSON for the frontend
        try {
            const parsed = JSON.parse(data.json_str);
            return NextResponse.json(parsed);
        } catch (e) {
            console.error("Failed to parse AI JSON response", data.json_str);
            return NextResponse.json({ error: "AI response was not valid JSON", raw: data.json_str }, { status: 500 });
        }

    } catch (error) {
        console.error("Analyze Chapter Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
