import { config } from "dotenv";
config({ path: ".env.local" });
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

async function main() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
  });

  const res = await embeddings.embedQuery("hello world");
  console.log("Vector length:", res.length);
  console.log("First 5 values:", res.slice(0, 5));
}

main().catch((err) => console.error("Error:", err));