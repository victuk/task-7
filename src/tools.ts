import { createTool } from "@mastra/core/tools";
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
  execute: async ({ city }) => {
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
    result: z.number().finite(),
  }),
  execute: async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "").trim();
    if (!sanitized) {
      throw new Error(`Invalid expression "${expression}": nothing to calculate.`);
    }
    let evaluated: unknown;
    try {
      evaluated = Function(`"use strict"; return (${sanitized})`)();
    } catch {
      throw new Error(`Invalid expression "${expression}": could not be evaluated.`);
    }
    const result = Number(evaluated);
    if (!Number.isFinite(result)) {
      throw new Error(`Expression "${expression}" did not evaluate to a finite number.`);
    }
    return { result };
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
  id: "get_hotel_schedule",
  description: "Returns hotel options and nightly hotel prices in USD for a city.",
  inputSchema: z.object({
    location: z.string().describe("City or area for hotel stay (e.g., Nairobi)"),
    nights: z.number().int().positive().describe("Total number of nights to stay"),
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
  id: "get_flight_schedule",
  description:
    "Returns the outbound and return flight durations (hours) and the round-trip price in USD between two cities.",
  inputSchema: z.object({
    origin: z.string().describe("The city you are departing from"),
    destination: z.string().describe("The destination city you are flying to"),
  }),
  outputSchema: z.object({
    origin: z.string(),
    destination: z.string(),
    outboundFlightHours: z.number(),
    returnFlightHours: z.number(),
    totalFlightTimeHours: z.number(),
    roundtripPriceUsd: z.number(),
    currency: z.string(),
  }),
  execute: async ({ origin, destination }) => {
    const outboundFlightHours = 5.5;
    const returnFlightHours = 5.5;
    return {
      origin,
      destination,
      outboundFlightHours,
      returnFlightHours,
      totalFlightTimeHours: outboundFlightHours + returnFlightHours,
      roundtripPriceUsd: 650,
      currency: "USD",
    };
  },
});

export const ragTool = createTool({
  id: "knowledge-base-search",
  description: "Searches internal knowledge base using semantic vector search.",
  inputSchema: z.object({
    query: z.string().describe("Semantic query to search internal documents"),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ query }) => {
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    const searchResults = await vectorStore.query({
      indexName: INDEX_NAME,
      queryVector: embedding,
      topK: 3,
    });

    const matches: string[] = searchResults
      .map((res: any) => res.metadata?.text)
      .filter((text: unknown): text is string => typeof text === "string" && text.length > 0);

    return {
      results: matches.length > 0 ? matches : ["No relevant internal knowledge found."],
    };
  },
});

const SUPPORTED_CURRENCIES = ["USD", "NGN", "KES", "EUR", "GBP"] as const;

const RATES: Record<(typeof SUPPORTED_CURRENCIES)[number], number> = {
  USD: 1.0,
  NGN: 1500.0,
  KES: 130.0,
  EUR: 0.92,
  GBP: 0.78,
};

export const currencyConverterTool = createTool({
  id: "convert_currency",
  description: `Converts an amount between supported currencies (${SUPPORTED_CURRENCIES.join(", ")}).`,
  inputSchema: z.object({
    amount: z.number().positive().describe("Amount to convert"),
    fromCurrency: z
      .enum(SUPPORTED_CURRENCIES)
      .describe(`Source currency, one of: ${SUPPORTED_CURRENCIES.join(", ")}`),
    toCurrency: z
      .enum(SUPPORTED_CURRENCIES)
      .describe(`Target currency, one of: ${SUPPORTED_CURRENCIES.join(", ")}`),
  }),
  outputSchema: z.object({
    originalAmount: z.number(),
    fromCurrency: z.string(),
    toCurrency: z.string(),
    exchangeRate: z.number(),
    convertedAmount: z.number(),
  }),
  execute: async ({ amount, fromCurrency, toCurrency }) => {
    const fromRate = RATES[fromCurrency];
    const toRate = RATES[toCurrency];
    const convertedAmount = (amount / fromRate) * toRate;
    return {
      originalAmount: amount,
      fromCurrency,
      toCurrency,
      convertedAmount: Number(convertedAmount.toFixed(2)),
      exchangeRate: Number((toRate / fromRate).toFixed(4)),
    };
  },
});
