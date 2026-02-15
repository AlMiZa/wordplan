-- Cache table for pronunciation tips
create table public.pronunciation_tips_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  word text not null,
  phonetic_transcription text not null,
  syllables text[] not null,
  pronunciation_tips text[] not null,
  memory_aids text[] not null,
  common_mistakes text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, word)
);

-- Enable Row Level Security
alter table public.pronunciation_tips_cache enable row level security;

-- Users can read their own cache entries
create policy "Users can view their own pronunciation tips cache"
  on public.pronunciation_tips_cache
  for select
  using (auth.uid() = user_id);

-- Users can insert their own cache entries
create policy "Users can insert their own pronunciation tips cache"
  on public.pronunciation_tips_cache
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own cache entries
create policy "Users can update their own pronunciation tips cache"
  on public.pronunciation_tips_cache
  for update
  using (auth.uid() = user_id);

-- Index for faster lookups
create index idx_pronunciation_tips_cache_user_word on public.pronunciation_tips_cache(user_id, word);

-- Function to update updated_at timestamp
create or replace function public.update_pronunciation_cache_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_pronunciation_cache_updated_at
  before update on public.pronunciation_tips_cache
  for each row execute procedure public.update_pronunciation_cache_updated_at();
