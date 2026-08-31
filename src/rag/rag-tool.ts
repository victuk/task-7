import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { embed } from "ai";
import { vectorStore, embeddingModel, INDEX_NAME } from "./store";

interface RagInput {
  query: string;
}

interface RagOutput {
  results: string[];
}

export const ragSearchTool = createTool({
  id: "knowledge-base-search",
  description: "Searches internal knowledge base using semantic vector search.",
  inputSchema: z.object({
    query: z.string().describe("Semantic query to search internal documents"),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ query }: RagInput): Promise<RagOutput> => {
    // 1. Generate the embedding vector for the search query
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // 2. RETRIEVE: Query vector store using the generated vector
    const searchResults = await vectorStore.query({
      indexName: INDEX_NAME,
      queryVector: embedding,
      topK: 3,
    });

    // 3. Extract the text field stored in metadata during ingestion
    const matches: string[] = searchResults
      .map((res: any) => res.metadata?.text)
      .filter((text: unknown): text is string => typeof text === "string" && text.length > 0);

    return {
      results: matches.length > 0 ? matches : ["No relevant internal knowledge found."],
    };
  },
});