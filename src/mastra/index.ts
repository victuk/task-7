import { Mastra } from "@mastra/core";
import { assistantAgent } from "../agent";
import { storage } from "../storage";

export const mastra = new Mastra({
  agents: { assistantAgent },
  storage,
});
