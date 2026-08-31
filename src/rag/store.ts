import { MDocument } from "@mastra/rag";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { LibSQLVector } from "@mastra/libsql";
import { embedMany } from "ai";

// 1. Initialize Vector Store with local SQLite file
export const vectorStore = new LibSQLVector({
  id: "libsql-vector-store",
  url: "file:local.db",
});


const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});


// 2. Define OpenRouter embedding model
// Note: OpenRouter uses model slugs prefixed by provider (e.g. 'openai/text-embedding-3-small')
export const embeddingModel = openrouter.textEmbeddingModel("openai/text-embedding-3-small");

export const INDEX_NAME = "internal_knowledge";

/**
 * CHUNK & EMBED: Processes raw text into chunks and upserts them into LibSQL vector store.
 */
export async function ingestDocument(documentId: string, content: string): Promise<void> {
  // A. Create Document instance
  const doc = MDocument.fromText(content);

  // B. CHUNK: Split document synchronously
  const chunks = await doc.chunk({
    strategy: "recursive",
    size: 512,
    overlap: 50,
  });

  // Extract raw strings safely from chunk objects
  const chunkTexts: string[] = chunks.map((c: any) => {
    if (typeof c === "string") return c;
    return c.text ?? c.content ?? String(c);
  });

  if (chunkTexts.length === 0) return;

  // C. EMBED: Generate vector embeddings using AI SDK + OpenRouter
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunkTexts,
  });

  // D. INDEX: Ensure index exists and upsert vectors into LibSQL
  await vectorStore.createIndex({
    indexName: INDEX_NAME,
    dimension: 1536,
    metric: "cosine",
  });

  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings, // number[][] array from embedMany
    metadata: chunkTexts.map((text: string, idx: number) => ({
      text,
      source: documentId,
      chunkIndex: idx,
    })),
    ids: chunkTexts.map((_, idx: number) => `${documentId}-chunk-${idx}`),
  });
}