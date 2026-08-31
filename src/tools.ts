import { createTool } from "@mastra/core/tools";
import { MDocument } from "@mastra/rag";
import { z } from "zod";


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


export const ragTool = createTool({
  id: "knowledge-base-search",
  description: "Tell users about employee paid time off and location of the primary server cluster's location",
  inputSchema: z.object({
    query: z.string().describe("Search query for knowledge base lookup"),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ query }) => {
    const doc = MDocument.fromText(
      "Internal Policy: Employees at Kodehauz get 25 days of paid time off. The primary server cluster is located in Jos, Nigeria."
    );

    const chunks = await doc.chunk({
      strategy: "recursive",
      size: 512,
      overlap: 50,
    });

    const matches = chunks
      .map((c) => (typeof c === "string" ? c : c.text))
      .filter((text) => text && text.toLowerCase().includes(query.toLowerCase()));

    return {
      results: matches.length > 0 ? matches : ["Kodehauz is an AI-centric company."],
    };
  },
});
