import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: { messages: UIMessage[]; conversationId: string } = await req.json();


  const lastMessage = messages[messages.length - 1];
  const userQuery =
    lastMessage.parts?.find((p) => p.type === "text")?.text ?? "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Ensure the conversation row exists (create on first message)
  await supabase
    .from("conversations")
    .upsert({ id: conversationId }, { onConflict: "id" });

  // 2. Save the user's message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userQuery,
  });

  // 3. Embed the query and retrieve relevant docs
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
  });
  const queryEmbedding = await embeddings.embedQuery(userQuery);

  const { data: matches, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: 4,
  });

  if (error) {
    console.error("Retrieval error:", error);
  }

  const context =
    matches?.map((m: { content: string }) => m.content).join("\n\n---\n\n") ??
    "";

  const systemPrompt = `You are a helpful customer support agent. Answer the user's question using ONLY the context below. If the answer isn't in the context, say you don't know and offer to escalate to a human agent. Be concise and friendly. Respond in the same language the user wrote in.

  Guidelines:
  - For general conversation, greetings, small talk, or generic how-to questions that aren't specific to our company's policies, you may answer naturally using your own knowledge.
  - For anything involving our specific policies, prices, deadlines, procedures, refunds, shipping, billing, or account rules — answer ONLY using the context below. Never guess or invent policy details, even if you think you know a typical/common answer.
  - If a policy-specific question isn't covered in the context below, say you don't have that specific information on file and offer to escalate to a human agent. Do not make up an answer for it.
  - Be concise and friendly. Respond in the same language the user wrote in.

Context:
${context}`;

  // 4. Stream the response, saving the full text once it's done
  const result = streamText({
    model: google("gemini-3.5-flash"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: text,
      });

      // Simple keyword-based escalation trigger
      const escalationPhrases = [
        "don't know",
        "not sure",
        "escalate",
        "human agent",
        "cannot help",
        "can't help",
        "unable to help",
      ];
      const shouldEscalate = escalationPhrases.some((phrase) =>
        text.toLowerCase().includes(phrase)
      );

      if (shouldEscalate) {
        await supabase.from("escalations").insert({
          conversation_id: conversationId,
          reason: "Agent could not resolve query: " + userQuery.slice(0, 200),
          status: "pending",
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}