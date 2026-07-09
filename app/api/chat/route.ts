import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Try to import GoogleGenAI safely (in case node_modules installation is still finalizing)
let GoogleGenAI: any = null;
try {
  const genaiPkg = require("@google/genai");
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  console.log("Google GenAI package not loaded yet, will fallback to local search.");
}

const CRISIS_KEYWORDS = [
  "following me", "someone is following", "in danger right now", "help me now",
  "he's outside", "trapped", "can't get away", "assault happening", "run away", "danger"
];

const GREETING_KEYWORDS = [
  "hi", "hii", "hiii", "hello", "hey", "heyy", "greetings", 
  "good morning", "good afternoon", "good evening", "yo", "sup", "hola"
];

function isCrisisQuery(query: string): boolean {
  const lowered = query.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowered.includes(keyword));
}

function isGreeting(query: string): boolean {
  const clean = query.replace(/[^\w\s]/g, "").trim().toLowerCase();
  return GREETING_KEYWORDS.includes(clean);
}

function cleanAndTokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, " ");
  return cleaned.split(/\s+/).filter(Boolean);
}

function retrieveRelevantChunks(query: string, topK = 3) {
  try {
    const storePath = path.join(process.cwd(), "lib", "rag_store.json");
    if (!fs.existsSync(storePath)) {
      return [
        {
          text: "Rotterdam general helpline numbers: Police Emergency: 112. Non-emergency support: 0900-8844. Veilig Thuis: 0800-2000.",
          source_title: "sample_helplines_fallback.md",
          source_type: "helpline",
          score: 0.5
        }
      ];
    }

    const storeData = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    const chunks = storeData.chunks || [];
    const df = storeData.df || {};
    const N = storeData.num_chunks || chunks.length;

    if (N === 0) return [];

    const queryTokens = cleanAndTokenize(query);
    if (queryTokens.length === 0) return [];

    const queryTf: Record<string, number> = {};
    for (const token of queryTokens) {
      queryTf[token] = (queryTf[token] || 0) + 1;
    }

    const queryVector: Record<string, number> = {};
    let queryMagSq = 0.0;
    for (const [token, count] of Object.entries(queryTf)) {
      const tokenDf = df[token] || 0;
      const idf = Math.log(1 + (N / (1 + tokenDf)));
      const val = count * idf;
      queryVector[token] = val;
      queryMagSq += val ** 2;
    }
    const queryMag = Math.sqrt(queryMagSq);

    if (queryMag === 0.0) return [];

    const scoredChunks = chunks.map((chunk: any) => {
      const chunkTf = chunk.tf || {};
      let dotProduct = 0.0;
      let chunkMagSq = 0.0;

      for (const [token, count] of Object.entries(chunkTf) as [string, number][]) {
        const tokenDf = df[token] || 0;
        const idf = Math.log(1 + (N / (1 + tokenDf)));
        const val = count * idf;
        chunkMagSq += val ** 2;

        if (queryVector[token]) {
          dotProduct += queryVector[token] * val;
        }
      }

      const chunkMag = Math.sqrt(chunkMagSq);
      const similarity = queryMag > 0 && chunkMag > 0 ? dotProduct / (queryMag * chunkMag) : 0.0;

      return {
        text: chunk.text,
        source_title: chunk.source_title,
        source_type: chunk.source_type,
        score: similarity
      };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const matches = scoredChunks.filter((c: any) => c.score > 0.0);

    return matches.length > 0 ? matches.slice(0, topK) : scoredChunks.slice(0, topK);
  } catch (err) {
    console.error("RAG Retrieval error:", err);
    return [];
  }
}

const SYSTEM_PROMPT = `You are Sahara, a safety information assistant for women in Rotterdam.
If the user's message is a greeting or general chit-chat, reply friendly and naturally as a helpful conversational assistant.
If the user asks safety-related, legal, or helpline questions, you must answer using only the provided context below. Always cite which source document your answer comes from. If the context does not contain a clear answer for safety queries, say so honestly and recommend contacting a local helpline or authority instead of guessing.
Never provide actionable legal advice beyond what is explicitly stated in the sources — always recommend the user consult a real legal professional or helpline.
Keep responses concise, clear, and reassuring.`;

function buildPrompt(question: string, contextChunks: any[]) {
  const contextText = contextChunks
    .map(c => `[Source: ${c.source_title}]\n${c.text}`)
    .join("\n\n");

  return `${SYSTEM_PROMPT}

Context:
${contextText}

User question: ${question}

Answer accordingly:`;
}

function buildFallbackResponse(contextChunks: any[]): string {
  const matches = contextChunks.filter((c: any) => c.score > 0);
  if (matches.length === 0) {
    return "[Sahara Local Mode]\n\nI couldn't find specific guidelines for that in our local manuals. For active concerns, please use the SOS panic button. For general support, contact the Rotterdam Police at 112 (emergencies) or 0900-8844 (non-emergencies).";
  }

  let res = "[Sahara Local Search Mode - Offline/Keyless]\n\nI retrieved the following citations:\n\n";
  for (const c of matches) {
    res += `📄 **From ${c.source_title}**:\n"${c.text.trim()}"\n\n`;
  }
  return res;
}

export async function POST(request: Request) {
  try {
    const { question, language } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    // 1. Crisis Interceptor
    if (isCrisisQuery(question)) {
      return NextResponse.json({
        answer: "⚠️ IMMEDIATE DANGER DETECTED. Swapping to Emergency SOS Hub in 3 seconds...",
        sources: [],
        is_crisis: true,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const contextChunks = retrieveRelevantChunks(question);

    // 2. Greeting Interceptor (when API key is missing or we bypass)
    if (!apiKey && isGreeting(question)) {
      return NextResponse.json({
        answer: "Hello! I am Sahara, your AI safety information assistant. I am here to help you with local safety guidelines, emergency helpline numbers, and legal rights in Rotterdam. How can I help you today?",
        sources: [],
        is_crisis: false,
      });
    }

    // 3. LLM Query Execution
    if (apiKey && GoogleGenAI) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildPrompt(question, contextChunks);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: 400
          }
        });

        const answerText = response.text || "";

        const validSources = contextChunks
          .filter((c: any) => c.score > 0)
          .map((c: any) => ({ title: c.source_title, type: c.source_type }));

        return NextResponse.json({
          answer: answerText.trim(),
          sources: validSources,
          is_crisis: false,
        });
      } catch (err: any) {
        console.error("Gemini call failed, falling back to local retrieval:", err);
      }
    }

    // 4. Offline/Keyless Fallback response
    const answer = buildFallbackResponse(contextChunks);
    const validSources = contextChunks
      .filter((c: any) => c.score > 0)
      .map((c: any) => ({ title: c.source_title, type: c.source_type }));

    return NextResponse.json({
      answer,
      sources: validSources,
      is_crisis: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
