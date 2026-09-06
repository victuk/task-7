import { MDocument } from "@mastra/rag";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { LibSQLVector } from "@mastra/libsql";
import { embedMany } from "ai";
import path from "node:path";
import "dotenv/config";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "local.db");

export const vectorStore = new LibSQLVector({
  id: "libsql-vector-store",
  url: `file:${DB_PATH}`,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const embeddingModel = openrouter.textEmbeddingModel("openai/text-embedding-3-small");

export const INDEX_NAME = "internal_knowledge";
const INDEX_DIMENSION = 1536;

async function ensureIndex(): Promise<void> {
  try {
    const stats = await vectorStore.describeIndex({ indexName: INDEX_NAME });
    if (stats.dimension !== INDEX_DIMENSION) {
      throw new Error(
        `Index "${INDEX_NAME}" exists with dimension ${stats.dimension}, expected ${INDEX_DIMENSION}. Delete it or change INDEX_DIMENSION.`,
      );
    }
  } catch {
    await vectorStore.createIndex({
      indexName: INDEX_NAME,
      dimension: INDEX_DIMENSION,
      metric: "cosine",
    });
  }
}

export async function ingestDocument(documentId: string, content: string): Promise<void> {
  const doc = MDocument.fromText(content);

  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
  });

  const chunkTexts: string[] = chunks.map((c: any) => {
    if (typeof c === "string") return c;
    return c.text ?? c.content ?? String(c);
  });

  if (chunkTexts.length === 0) return;

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunkTexts,
  });

  await ensureIndex();

  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: chunkTexts.map((text: string, idx: number) => ({
      text,
      source: documentId,
      chunkIndex: idx,
    })),
    ids: chunkTexts.map((_, idx: number) => `${documentId}-chunk-${idx}`),
  });
}
