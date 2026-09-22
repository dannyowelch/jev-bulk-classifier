import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state, instructions, criteria, apiKey } = body;

    const key = apiKey || process.env.TYPESAFE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const startMs = Date.now();
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        state,
        model: "jev-latest",
        questions: {
          label: {
            type: "choice",
            instructions,
            criteria,
          },
        },
      }),
    });

    const elapsedMs = Date.now() - startMs;

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `TypeSafe API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const answer = data.answers?.label;

    if (!answer) {
      return NextResponse.json(
        { error: "No answer in response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      label: answer.choice,
      confidence: answer.confidence,
      elapsedMs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
