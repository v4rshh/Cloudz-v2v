import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, route } = await request.json();

    if (!userId || !route) {
      return NextResponse.json({ error: "userId and route are required" }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();

    // Stubs Follow Me session monitoring
    return NextResponse.json({
      message: "Follow Me session started (offline bypass).",
      sessionId
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
