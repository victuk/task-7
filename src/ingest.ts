import "dotenv/config";
import { ingestDocument } from "./rag/store";

const documents: Array<{ id: string; content: string }> = [
  {
    id: "policy-001",
    content:
      "Internal Policy: Employees at Kodehauz get 25 days of paid time off. The primary server cluster is located in Jos, Nigeria.",
  },
];

let failed = 0;
for (const doc of documents) {
  try {
    await ingestDocument(doc.id, doc.content);
    console.log(`✔ Ingested "${doc.id}"`);
  } catch (error: any) {
    failed++;
    console.error(`✖ Failed to ingest "${doc.id}":`, error?.message ?? error);
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log("Ingestion complete.");
