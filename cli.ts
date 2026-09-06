import readline from "node:readline";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { mastra } from "./src/mastra/index";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const THREAD_ID = `cli-${randomUUID()}`;
const RESOURCE_ID = "cli-user";

let stdinClosed = false;
rl.on("close", () => {
  stdinClosed = true;
});

console.clear();
console.log(
  "\x1b[36m========================================================\x1b[0m",
);
console.log("\x1b[1m  🤖 Mastra AI CLI Assistant by Victor Ukok \x1b[0m");
console.log("  Type '\x1b[33mexit\x1b[0m' or press Ctrl+C to stop.");
console.log(
  "\x1b[36m========================================================\x1b[0m\n",
);

async function generateResponse(userInput: string): Promise<void> {
  const agent = mastra.getAgent("assistantAgent");

  process.stdout.write("\x1b[34mAI > \x1b[0m");

  let fullResponse = "";
  const streamResponse = await agent.stream(userInput, {
    maxSteps: 8,
    memory: {
      thread: THREAD_ID,
      resource: RESOURCE_ID,
    },
  });

  for await (const chunk of streamResponse.textStream) {
    process.stdout.write(chunk);
    fullResponse += chunk;
  }
  process.stdout.write("\n\n");

  if (!fullResponse) {
    console.log("No response at the moment, please try again with the same prompt or adjust your prompt.");
  }
}

function promptUser(): void {
  if (stdinClosed) {
    cleanupAndExit();
    return;
  }
  rl.question("\x1b[32mYou > \x1b[0m", (input) => {
    const userInput = input.trim();
    if (!userInput) {
      promptUser();
      return;
    }

    if (userInput.toLowerCase() === "exit") {
      cleanupAndExit();
      return;
    }

    generateResponse(userInput)
      .catch((error: any) => {
        console.error("\n\x1b[31m[Error generating response]:\x1b[0m", error?.message ?? error);
      })
      .finally(() => {
        if (stdinClosed) {
          cleanupAndExit();
          return;
        }
        promptUser();
      });
  });
}

function cleanupAndExit(): void {
  console.log("\n\x1b[33mGoodbye!\x1b[0m");
  rl.close();
  process.exit(0);
}

rl.on("SIGINT", () => {
  cleanupAndExit();
});

promptUser();
