"""
Document Ingestion Pipeline for the Sahara RAG Safety Assistant.
Compiles a local TF-IDF document database saved to `rag_store.json`.

Usage:
    python ingest.py --source ./documents
"""

import os
import argparse
import json
import re
from typing import List, Dict

CHUNK_SIZE = 120  # ~120 words per chunk
CHUNK_OVERLAP = 20


def clean_and_tokenize(text: str) -> List[str]:
    """Lowercase and extract words."""
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    return cleaned.split()


def compute_tf(tokens: List[str]) -> Dict[str, int]:
    """Compute term frequency counts."""
    tf = {}
    for token in tokens:
        tf[token] = tf.get(token, 0) + 1
    return tf


def load_documents(source_dir: str) -> List[Dict]:
    """Load all .txt/.md files from the source directory as raw documents."""
    docs = []
    if not os.path.exists(source_dir):
        return docs
    for filename in os.listdir(source_dir):
        if filename.endswith((".txt", ".md")):
            path = os.path.join(source_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            docs.append({
                "title": filename,
                "content": content,
                "source_type": infer_type(filename)
            })
    return docs


def infer_type(filename: str) -> str:
    lower = filename.lower()
    if "law" in lower or "statute" in lower:
        return "law"
    if "helpline" in lower or "contact" in lower:
        return "helpline"
    if "ngo" in lower:
        return "ngo"
    return "general"


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Word-based chunking with overlap."""
    words = text.split()
    chunks = []
    start = 0
    if len(words) == 0:
        return []
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        # Advance by size minus overlap, ensuring we make forward progress
        advance = chunk_size - overlap
        if advance <= 0:
            advance = 1
        start += advance
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=None, help="Directory containing source documents")
    args = parser.parse_args()

    # Determine absolute path to documents directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    source_dir = args.source if args.source else os.path.join(current_dir, "documents")

    print(f"Ingesting documents from: {source_dir}")

    docs = load_documents(source_dir)
    if not docs:
        print("No documents found. Please add safety manuals or directories to the documents/ folder.")
        return

    print(f"Loaded {len(docs)} documents.")

    db_chunks = []
    for doc in docs:
        text_chunks = chunk_text(doc["content"])
        print(f"Chunked '{doc['title']}' into {len(text_chunks)} segments.")
        for idx, text in enumerate(text_chunks):
            tokens = clean_and_tokenize(text)
            tf = compute_tf(tokens)
            db_chunks.append({
                "id": f"{doc['title']}-{idx}",
                "text": text,
                "source_title": doc["title"],
                "source_type": doc["source_type"],
                "tf": tf,
                "token_count": len(tokens)
            })

    # Calculate Document Frequency (DF) across all chunks
    df = {}
    for chunk in db_chunks:
        unique_tokens = set(chunk["tf"].keys())
        for token in unique_tokens:
            df[token] = df.get(token, 0) + 1

    # Save to index store
    store_data = {
        "chunks": db_chunks,
        "df": df,
        "num_chunks": len(db_chunks)
    }

    output_path = os.path.join(current_dir, "rag_store.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(store_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully compiled {len(db_chunks)} chunks to: {output_path}")


if __name__ == "__main__":
    main()
