"""
Core RAG Pipeline for the Sahara Safety Assistant.
Integrates local retrieval context and prompts Gemini APIs for answers.
"""

import os
from typing import Dict, List
import google.generativeai as genai

from .retriever import retrieve_relevant_chunks, is_crisis_query

# Setup Gemini model
api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
model = None

if api_key and len(api_key.strip()) > 0:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        print("[RAG] Gemini model (gemini-2.5-flash) initialized successfully.")
    except Exception as e:
        print(f"[RAG] Failed to initialize Gemini client: {e}")
else:
    print("[RAG] No Gemini API key found. Sahara is running in Local Search citations mode.")


SYSTEM_PROMPT = """You are Sahara, a safety information assistant for women in Rotterdam.
If the user's message is a greeting or general chit-chat, reply friendly and naturally as a helpful conversational assistant.
If the user asks safety-related, legal, or helpline questions, you must answer using only the provided context below. Always cite which source document your answer comes from. If the context does not contain a clear answer for safety queries, say so honestly and recommend contacting a local helpline or authority instead of guessing.
Never provide actionable legal advice beyond what is explicitly stated in the sources — always recommend the user consult a real legal professional or helpline.
Keep responses concise, clear, and reassuring."""


def build_prompt(question: str, context_chunks: list) -> str:
    context_text = "\n\n".join(
        f"[Source: {c['source_title']}]\n{c['text']}" for c in context_chunks
    )
    return f"""{SYSTEM_PROMPT}

Context:
{context_text}

User question: {question}

Answer accordingly:"""


def build_fallback_response(context_chunks: List[Dict]) -> str:
    """Offline/No-API-Key retrieval formatter."""
    if not context_chunks or not any(c.get("score", 0) > 0 for c in context_chunks):
        return (
            "[Sahara Local Mode]\n\n"
            "I couldn't find specific guidelines for that in our local manuals. "
            "For active concerns, please use the SOS panic button. For general support, "
            "contact the Rotterdam Police at 112 (emergencies) or 0900-8844 (non-emergencies)."
        )
    
    # Format and join matching chunks
    res = "[Sahara Local Search Mode - Offline/Keyless]\n\nI retrieved the following citations:\n\n"
    for idx, c in enumerate(context_chunks):
        if c.get("score", 0) > 0:
            res += f"📄 **From {c['source_title']}**:\n\"{c['text'].strip()}\"\n\n"
    return res


def call_llm(prompt: str, context_chunks: list) -> str:
    """Queries Gemini if configured, else formatting local retrieval."""
    global model
    if model:
        try:
            response = model.generate_content(
                contents=prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=400
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"[RAG] Default model generation failed: {e}. Trying gemini-3.5-flash...")
            try:
                alt_model = genai.GenerativeModel("gemini-3.5-flash")
                response = alt_model.generate_content(
                    contents=prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        max_output_tokens=400
                    )
                )
                model = alt_model
                return response.text.strip()
            except Exception as e2:
                print(f"[RAG] gemini-3.5-flash retry failed: {e2}. Trying gemini-flash-latest...")
                try:
                    alt_model2 = genai.GenerativeModel("gemini-flash-latest")
                    response = alt_model2.generate_content(
                        contents=prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.3,
                            max_output_tokens=400
                        )
                    )
                    model = alt_model2
                    return response.text.strip()
                except Exception as e3:
                    print(f"[RAG] gemini-flash-latest retry failed: {e3}. Falling back to local search.")
            return build_fallback_response(context_chunks)
    else:
        return build_fallback_response(context_chunks)


def is_greeting(query: str) -> bool:
    clean = "".join(c for c in query if c.isalnum() or c.isspace()).strip().lower()
    return clean in [
        "hi", "hii", "hiii", "hello", "hey", "heyy", "greetings", 
        "good morning", "good afternoon", "good evening", "yo", "sup", "hola"
    ]


def answer_question(question: str, language: str = "en") -> Dict:
    # Crisis Keyword Interceptor
    if is_crisis_query(question):
        return {
            "answer": "⚠️ IMMEDIATE DANGER DETECTED. Swapping to Emergency SOS Hub in 3 seconds...",
            "sources": [],
            "is_crisis": True,
        }

    # Friendly Greeting Interceptor (Only in offline/fallback mode when model is inactive)
    if not model and is_greeting(question):
        return {
            "answer": "Hello! I am Sahara, your AI safety information assistant. I am here to help you with local safety guidelines, emergency helpline numbers, and legal rights in Rotterdam. How can I help you today?",
            "sources": [],
            "is_crisis": False,
        }

    # Retrieve matching chunks
    context_chunks = retrieve_relevant_chunks(question)
    
    # Build prompt and execute query
    prompt = build_prompt(question, context_chunks)
    answer_text = call_llm(prompt, context_chunks)

    # Filter out sources with zero score for clean citation output
    valid_sources = [
        {"title": c["source_title"], "type": c["source_type"]} 
        for c in context_chunks if c.get("score", 0) > 0
    ]

    return {
        "answer": answer_text,
        "sources": valid_sources,
        "is_crisis": False,
    }
