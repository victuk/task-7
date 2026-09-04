import { Agent } from "@mastra/core/agent";
import { weatherTool, calculatorTool, timeTool, ragTool } from "./tools";
import { ragSearchTool } from "./rag/rag-tool";

const modelName = process.env.MODEL_NAME!! || "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free";

export const assistantAgent = new Agent({
    id: "assistant-agent",
  name: "CLI Assistant",
  instructions:
    "You are a helpful, efficient, and concise command-line AI assistant. Use tools when necessary to provide accurate information.",
  model: {
    id: modelName as `${string}/${string}`,
    apiKey: process.env.OPENROUTER_API_KEY!!,
  },
  tools: {
    weatherTool,
    calculatorTool,
    timeTool,
    ragSearchTool,
  },
});