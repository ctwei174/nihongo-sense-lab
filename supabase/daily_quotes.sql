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
  '雨ニモマケズ 風ニモマケズ',
  '不輸給雨，也不輸給風。',
  '宮沢 賢治',
  '雨ニモマケズ',
  '青空文庫',
  'https://www.aozora.gr.jp/cards/000081/card45630.html',
  'N2',
  '忍耐',
  'Nにも負けず',
  '「Nにも負けず」表示即使面對某種壓力或困難也不屈服。可用來寫決心、習慣或長期目標。',
  '請用「Nにも負けず」寫一句日文，描述你學日文時想克服的一件事。',
  current_date
)
on conflict (display_date) do nothing;
