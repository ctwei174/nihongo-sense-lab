import { NextResponse } from "next/server";
import {
  askLearningAssistant,
  type ChatMessage,
} from "@/lib/ai/chatAssistant";
import { createClient } from "@/lib/supabase/server";

type ChatRequest = {
  messages?: ChatMessage[];
  pagePath?: string;
  pageText?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "請先登入後再使用 GPT 助教。" }, { status: 401 });
  }

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "請送出有效的提問內容。" }, { status: 400 });
  }

  try {
    const answer = await askLearningAssistant({
      messages: body.messages ?? [],
      pagePath: body.pagePath,
      pageText: body.pageText,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
