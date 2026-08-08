import { config } from "dotenv";
config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const googleKey = process.env.GOOGLE_API_KEY!;

  console.log("URL:", supabaseUrl);
  console.log("SERVICE KEY exists:", !!supabaseKey);
  console.log("GOOGLE KEY exists:", !!googleKey);


  if (!supabaseUrl || !supabaseKey || !googleKey) {
    throw new Error("Missing env vars — check .env.local");
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  const docsDir = path.join(process.cwd(), "docs");
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    throw new Error("No .md files found in docs/");
  }

  console.log(`Found ${files.length} doc file(s): ${files.join(", ")}`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const allDocs: Document[] = [];

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const chunks = await splitter.createDocuments(
      [content],
      [{ source: file }]
    );

    allDocs.push(...chunks);
  }

  console.log(`Split into ${allDocs.length} chunks total.`);

  const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
});

  await SupabaseVectorStore.fromDocuments(allDocs, embeddings, {
    client: supabaseClient,
    tableName: "documents",
    queryName: "match_documents",
  });

  console.log("✅ Ingestion complete — documents table populated.");
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});