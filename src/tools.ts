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
    'Returns hotel options and nightly hotel prices in USD for a city.',

  inputSchema: z.object({
    location: z.string().describe('City or area for hotel stay (e.g., Nairobi)'),
    nights: z.number().describe('Total number of nights to stay'),
  }),
  outputSchema: z.object({
    location: z.string(),
    currency: z.string(),
    nights: z.number(),
    pricePerNight: z.number(),
    totalPrice: z.number(),
  }),
  execute: async ({ location, nights }) => {
    const pricePerNight = 120.0;
    return {
      location,
      nights,
      pricePerNight,
      totalPrice: pricePerNight * nights,
      currency: "USD",
    };
  },
});

export const flightScheduleTool = createTool({
  id: 'get_flight_schedule',
  description:
    'Returns a one-way flight duration and one-way price in USD between two cities.',
  inputSchema: z.object({
    origin: z.string().describe('The city your are departing in which you ar flying from'),
    destination: z.string().describe('The city of destination in which you are flying to'),
  }),
  outputSchema: z.object({
    origin: z.string(),
    destination: z.string(),
    outboundFlightHours: z.number(),
    returnFlightHours: z.number(),
    roundtripPriceUsd: z.number(),
    currency: z.string(),
  }),
  execute: async ({ origin, destination }) => {
    return {
      origin,
      destination,
      outboundFlightHours: 5.5,
      returnFlightHours: 5.5,
      totalFlightTimeHours: 11.0,
      roundtripPriceUsd: 650,
      currency: "USD"
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
    fromCurrency: z.string().describe('Source currency currency'),
    toCurrency: z.string().describe('Target currency currency'),
  }),
  outputSchema: z.object({
    originalAmount: z.number(),
    fromCurrency: z.string(),
    toCurrency: z.string(),
    exchangeRate: z.number(),
    convertedAmount: z.number(),
  }),
  execute: async ({ amount, fromCurrency, toCurrency }) => {
    const source = fromCurrency.toUpperCase();
    const target = toCurrency.toUpperCase();
    const rates: {[value: string]: number} = {
    USD: 1.0,
    NGN: 1500.0,
    KES: 130.0,
    EUR: 0.92,
    GBP: 0.78,
  };

  const fromRate = rates[source] || 1.0;
  const toRate = rates[target] || 1.0;

  const amountInUsd = amount / fromRate;
  const convertedAmount = amountInUsd * toRate;
    return {
      originalAmount: amount,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      convertedAmount: Number(convertedAmount.toFixed(2)),
      exchangeRate: Number((toRate / fromRate).toFixed(4)),
    };
  },
});
/*
I'm flying from Lagos to Nairobi for a 3-night conference and need to book a hotel there too. Work out the flight schedule and the hotel cost, convert the total logistics cost to NGN, and then check our internal travel policy to tell me whether this trip needs pre-approval and wh at the approved hotel budget per night is.
*/