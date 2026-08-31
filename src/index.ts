import { Mastra } from "@mastra/core";
import { assistantAgent } from "./agent";
import "dotenv/config";

export const mastra = new Mastra({
    agents: { assistantAgent },
});