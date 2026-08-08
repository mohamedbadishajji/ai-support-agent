import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { conversationId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("escalations")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  return Response.json({ escalated: (data?.length ?? 0) > 0 });
}