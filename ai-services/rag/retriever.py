"""
Retriever Module for the Sahara RAG Safety Assistant.
Loads `rag_store.json` and performs TF-IDF Cosine Similarity query matching.
"""

import os
import json
import re
import math
from typing import List, Dict

TOP_K = 3


def clean_and_tokenize(text: str) -> List[str]:
    """Lowercase and extract words."""
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    return cleaned.split()


def retrieve_relevant_chunks(query: str, top_k: int = TOP_K) -> List[Dict]:
    """
    Retrieves the most semantically relevant safety document chunks using TF-IDF 
    and Cosine Similarity.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    store_path = os.path.join(current_dir, "rag_store.json")

    # If database index is missing, return fallback stub
    if not os.path.exists(store_path):
        print(f"[retriever] Database index '{store_path}' not found. Please run ingest.py first.")
        return [
            {
                "text": "Rotterdam general helpline numbers: Police Emergency: 112. Non-emergency support: 0900-8844. Veilig Thuis: 0800-2000.",
                "source_title": "sample_helplines_fallback.md",
                "source_type": "helpline",
                "score": 0.5
            }
        ]

    with open(store_path, "r", encoding="utf-8") as f:
        store_data = json.load(f)

    chunks = store_data.get("chunks", [])
    df = store_data.get("df", {})
    N = store_data.get("num_chunks", len(chunks))

    if N == 0:
        return []

    # Tokenize user query
    query_tokens = clean_and_tokenize(query)
    if not query_tokens:
        return []

    # Calculate query TF-IDF vector
    query_tf = {}
    for t in query_tokens:
        query_tf[t] = query_tf.get(t, 0) + 1

    query_vector = {}
    query_mag_sq = 0.0
    for token, count in query_tf.items():
        # IDF: ln(1 + N / (1 + df))
        token_df = df.get(token, 0)
        idf = math.log(1 + (N / (1 + token_df)))
        val = count * idf
        query_vector[token] = val
        query_mag_sq += val ** 2
    query_mag = math.sqrt(query_mag_sq)

    if query_mag == 0.0:
        return []

    scored_chunks = []
    for chunk in chunks:
        chunk_tf = chunk.get("tf", {})
        
        # Calculate dot product and chunk magnitude
        dot_product = 0.0
        chunk_mag_sq = 0.0
        
        # Calculate full chunk magnitude vector
        for token, count in chunk_tf.items():
            token_df = df.get(token, 0)
            idf = math.log(1 + (N / (1 + token_df)))
            val = count * idf
            chunk_mag_sq += val ** 2
            
            # If token is in query, add to dot product
            if token in query_vector:
                dot_product += query_vector[token] * val
                
        chunk_mag = math.sqrt(chunk_mag_sq)
        
        # Calculate Cosine Similarity
        similarity = 0.0
        if query_mag > 0 and chunk_mag > 0:
            similarity = dot_product / (query_mag * chunk_mag)

        scored_chunks.append({
            "text": chunk["text"],
            "source_title": chunk["source_title"],
            "source_type": chunk["source_type"],
            "score": similarity
        })

    # Sort by similarity descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    
    # Filter out absolute zero matches and slice to top-k
    matches = [c for c in scored_chunks if c["score"] > 0.0]
    
    if not matches:
        # Fallback to general chunks if zero matches found
        return scored_chunks[:top_k]

    return matches[:top_k]


CRISIS_KEYWORDS = [
    "following me", "someone is following", "in danger right now", "help me now",
    "he's outside", "trapped", "can't get away", "assault happening", "run away", "danger"
]


def is_crisis_query(query: str) -> bool:
    """Simple keyword-based crisis detector that bypasses RAG chat and surfaces SOS UI directly."""
    lowered = query.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)
