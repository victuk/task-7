import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import {
  weatherTool,
  calculatorTool,
  timeTool,
  ragTool,
  hotelScheduleTool,
  flightScheduleTool,
  currencyConverterTool,
} from "./tools";
import { storage } from "./storage";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required. Copy .env-example to .env and set it.");
}

const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const rawModelName = process.env.MODEL_NAME?.trim() || DEFAULT_MODEL;
const modelName = rawModelName.startsWith("openrouter/") ? rawModelName : `openrouter/${rawModelName}`;

export const memory = new Memory({
  storage,
  options: {
    lastMessages: 20,
  },
});

export const assistantAgent = new Agent({
  id: "assistant-agent",
  name: "CLI Assistant",
  instructions:
    "You are a helpful, efficient, and concise command-line AI assistant. Use tools when necessary to provide accurate information.",
  model: {
    id: modelName as `${string}/${string}`,
    apiKey: OPENROUTER_API_KEY,
  },
  memory,
  tools: {
    weatherTool,
    calculatorTool,
    timeTool,
    hotelScheduleTool,
    flightScheduleTool,
    currencyConverterTool,
    ragTool,
  },
});
