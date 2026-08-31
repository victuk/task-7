import readline from "node:readline";
import "dotenv/config";
import { mastra } from "./index";
import { BaseMessageListItem } from "@mastra/core/agent/message-list";
import { ingestDocument } from "./rag/store";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

await ingestDocument(
  "policy-001",
  "Internal Policy: Employees at Kodehauz get 25 days of paid time off. The primary server cluster is located in Jos, Nigeria."
);

// In-memory conversation thread history
const conversationHistory: BaseMessageListItem[] = [];

console.clear();
console.log("\x1b[36m========================================================\x1b[0m");
console.log("\x1b[1m  🤖 Mastra AI CLI Assistant Loaded (OpenRouter Powered)\x1b[0m");
console.log("  Type '\x1b[33mexit\x1b[0m' or press Ctrl+C to stop.");
console.log("\x1b[36m========================================================\x1b[0m\n");

const agent = mastra.getAgent("assistantAgent");

function promptUser() {
  rl.question("\x1b[32mYou > \x1b[0m", async (input) => {
    const userInput = input.trim();

    if (!userInput) {
      promptUser();
      return;
    }

    if (userInput.toLowerCase() === "exit") {
      cleanupAndExit();
      return;
    }

    // Push user message to local history
    conversationHistory.push({ role: "user", content: userInput });

    process.stdout.write("\x1b[34mAI > \x1b[0m");

    let fullResponse = "";

    try {
      // Initiate streaming response with full thread context
      const streamResponse = await agent.stream(conversationHistory);

      for await (const chunk of streamResponse.textStream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      process.stdout.write("\n\n");

      // Save complete assistant turn to history
      conversationHistory.push({ role: "assistant", content: fullResponse });
    } catch (error: any) {
      console.error("\n\x1b[31m[Error generating response]:\x1b[0m", error?.message || error);
      console.log();
    }

    promptUser();
  });
}

function cleanupAndExit() {
  console.log("\n\x1b[33mGoodbye!\x1b[0m");
  rl.close();
  process.exit(0);
}

// Intercept Ctrl+C gracefully
rl.on("SIGINT", () => {
  cleanupAndExit();
});

// Launch loop
promptUser();
