import { createTool } from "@mastra/core/tools";
import { MDocument } from "@mastra/rag";
import { z } from "zod";
import { embed } from "ai";
import { vectorStore, embeddingModel, INDEX_NAME } from "./rag/store";


export const weatherTool = createTool({
  id: "get-weather",
  description: "Get weather details for a specific city",
  inputSchema: z.object({
    city: z.string().describe("The city to fetch weather for"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
  }),
  execute: async ({ city } ) => {
    return {
      temperature: 22,
      conditions: `Partly cloudy in ${city}`,
    };
  },
});


export const calculatorTool = createTool({
  id: "calculator",
  description: "Perform mathematical calculations",
  inputSchema: z.object({
    expression: z.string().describe("Mathematical expression to evaluate (e.g., '12 * 45')"),
  }),
  outputSchema: z.object({
    result: z.number(),
  }),
  execute: async ({expression}) => {
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { result: Number(result) };
  },
});


export const timeTool = createTool({
  id: "get-current-time",
  description: "Get the current time in UTC",
  inputSchema: z.object({}),
  outputSchema: z.object({
    currentTime: z.string(),
  }),
  execute: async () => {
    return { currentTime: new Date().toISOString() };
  },
});

export const hotelScheduleTool = createTool({
  id: 'get_hotel_schedule',

  description:
    'Returns mock hotel options and nightly hotel prices in USD for a city.',

  inputSchema: z.object({
    city: z.string().describe('City where the hotels are located'),
  }),

  outputSchema: z.object({
    city: z.string(),

    hotels: z.array(
      z.object({
        name: z.string(),
        priceUsd: z.number(),
      }),
    ),
  }),

  execute: async ({ city }) => {
    return {
      city,
      hotels: [
        {
          name: 'Nairobi Serena',
          priceUsd: 250,
        },
        {
          name: 'Radisson Blu',
          priceUsd: 200,
        },
      ],
    };
  },
});

export const flightScheduleTool = createTool({
  id: 'get_flight_schedule',
  description:
    'Returns a mock one-way flight duration and one-way price in USD between two cities.',
  inputSchema: z.object({
    origin: z.string().describe('Departure city'),
    destination: z.string().describe('Destination city'),
  }),
  outputSchema: z.object({
    origin: z.string(),
    destination: z.string(),
    flightTimeHours: z.number(),
    priceUsd: z.number(),
  }),
  execute: async ({ origin, destination }) => {
    return {
      origin,
      destination,
      flightTimeHours: 5.5,
      priceUsd: 920,
    };
  },
});


interface RagInput {
  query: string;
}

interface RagOutput {
  results: string[];
}

export const ragTool = createTool({
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

export const currencyConverterTool = createTool({
  id: 'convert_currency',
  description: 'Converts a money between supported currencies.',
  inputSchema: z.object({
    amount: z.number().describe('Amount to convert'),
    fromCurrency: z.string().describe('Source currency code'),
    toCurrency: z.string().describe('Target currency code'),
  }),
  outputSchema: z.object({
    originalAmount: z.number(),
    originalCurrency: z.string(),
    exchangeRate: z.number(),
    amountConverted: z.number(),
    currency: z.string(),
  }),
  execute: async ({ amount, fromCurrency, toCurrency }) => {
    const source = fromCurrency.toUpperCase();
    const target = toCurrency.toUpperCase();
    const exchangeRates: Record<string, number> = {
      'USD-NGN': 1400,
    };
    const rate = exchangeRates[`${source}-${target}`];
    return {
      originalAmount: amount,
      originalCurrency: source,
      exchangeRate: rate,
      amountConverted: amount * rate,
      currency: target,
    };
  },
});
