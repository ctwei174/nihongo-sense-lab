create table if not exists public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_ja text not null,
  quote_zh text,
  author text,
  work_title text,
  source_name text,
  source_url text,
  level text check (level in ('N2', 'N1', 'Advanced')),
  theme text,
  expression_focus text,
  explanation_zh text,
  output_prompt text,
  display_date date unique,
  created_at timestamptz default now()
);

alter table public.daily_quotes enable row level security;

grant usage on schema public to authenticated;
grant select on table public.daily_quotes to authenticated;

drop policy if exists "Authenticated users can view daily quotes"
on public.daily_quotes;

create policy "Authenticated users can view daily quotes"
on public.daily_quotes
for select
to authenticated
using (true);

insert into public.daily_quotes (
  quote_ja,
  quote_zh,
  author,
  work_title,
  source_name,
  source_url,
  level,
  theme,
  expression_focus,
  explanation_zh,
  output_prompt,
  display_date
) values
(
  '山路を登りながら、こう考えた。智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。',
  '沿著山路往上走時，我這樣想：只憑理智行事會與人衝突；任由情感推動又會隨波逐流；堅持己見則令人窒息。',
  '夏目 漱石',
  '草枕',
  '青空文庫',
  'https://www.aozora.gr.jp/cards/000148/card776.html',
  'N1',
  '理性與情感',
  'Vば / Nに働く / Nに棹さす',
  '這段連續使用條件句，將三種處世態度並列，形成文學中常見的抽象論述。重點不只在「Vば」，也在「智に働く」「情に棹さす」這類抽象名詞與動詞的搭配。',
  '請仿照「Vば...。Vば...。Vば...。」寫三句日文，分析一個兩難處境。',
  current_date
)
on conflict (display_date) do update set
  quote_ja = excluded.quote_ja,
  quote_zh = excluded.quote_zh,
  author = excluded.author,
  work_title = excluded.work_title,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  level = excluded.level,
  theme = excluded.theme,
  expression_focus = excluded.expression_focus,
  explanation_zh = excluded.explanation_zh,
  output_prompt = excluded.output_prompt;
