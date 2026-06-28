import { NextResponse } from "next/server";
import { generateJapaneseArticle } from "@/lib/ai/generateArticle";
import { createClient } from "@/lib/supabase/server";

type GenerateArticleRequest = {
  title?: string;
  topic?: string;
  materialType?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "請先登入後再生成文章。" }, { status: 401 });
  }

  let body: GenerateArticleRequest;

  try {
    body = (await request.json()) as GenerateArticleRequest;
  } catch {
    return NextResponse.json({ error: "請送出有效的生成條件。" }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const topic = body.topic?.trim() ?? "";

  if (!title && !topic) {
    return NextResponse.json(
      { error: "請先輸入標題或主題標籤，再讓 AI 生成文章。" },
      { status: 400 },
    );
  }

  try {
    const content = await generateJapaneseArticle({
      title,
      topic,
      materialType: body.materialType,
    });

    return NextResponse.json({
      content,
      length: content.length,
      preview: content.slice(0, 240),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
