import { NextResponse } from "next/server";
import { fetchUrlMaterial } from "@/lib/importUrl";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "請先登入後再讀取網址。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    url?: string;
  } | null;
  const url = body?.url?.trim();

  if (!url) {
    return NextResponse.json({ error: "請先輸入網址。" }, { status: 400 });
  }

  try {
    const material = await fetchUrlMaterial(url);

    return NextResponse.json({
      title: material.title,
      content: material.content,
      preview: material.content.slice(0, 900),
      length: material.content.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
