import { NextResponse } from "next/server";

const DEFAULT_CLIPS = [
  "Hey! Where are you? I'm walking near the main street right now, I will meet you in two minutes. Just stay on the line, I am right around the corner.",
  "Hey, I'm standing right outside the cafe near the crossing. I can see you coming up the street. Keep walking, I'll wave to you in a second!",
  "Hi! I just got the car parked. I'm walking up to meet you at the corner now. Stay on the phone with me until I see you.",
  "Hey, I'm just leaving the building now. I'll be at the entrance in less than a minute. Are you almost here? I'm looking out for you."
];

export async function POST(request: Request) {
  try {
    const { situation } = await request.json().catch(() => ({ situation: "default" }));
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      // Offline fallback: return a randomized realistic pre-generated clip dialogue
      const randomClip = DEFAULT_CLIPS[Math.floor(Math.random() * DEFAULT_CLIPS.length)];
      return NextResponse.json({
        source: "local_preset",
        dialogue: randomClip
      });
    }

    // Dynamic Groq Llama-3 API request
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a helpful safety companion simulating a phone call to help the user escape an uncomfortable or unsafe situation. Generate a single spoken paragraph from the perspective of a friend, parent, or partner calling them. The dialogue must be natural, casual, and provide a clear excuse indicating you are nearby or meeting them soon. Keep it short (2 to 3 sentences, maximum 45 words). Do not output quotes, intro/outro text, stage directions, or parenthetical notes. Output ONLY the raw spoken dialogue."
          },
          {
            role: "user",
            content: `The user's environment situation is: "${situation || "walking home alone at night"}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const dialogue = data.choices?.[0]?.message?.content?.trim();

    if (!dialogue) {
      throw new Error("Empty completion returned from Groq");
    }

    return NextResponse.json({
      source: "groq_api",
      dialogue
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate dialogue";
    console.warn("Groq API generation failed, falling back to local presets:", message);
    const randomClip = DEFAULT_CLIPS[Math.floor(Math.random() * DEFAULT_CLIPS.length)];
    return NextResponse.json({
      source: "local_preset_fallback",
      dialogue: randomClip
    });
  }
}
