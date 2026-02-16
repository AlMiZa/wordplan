-- Chat tables for Smart Tutor Chat feature
-- These tables store chat sessions and messages between users and the AI tutor

-- Create chats table
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on chats
alter table public.chats enable row level security;

-- RLS policies for chats
create policy "Users can view their own chats"
  on public.chats for select using (auth.uid() = user_id);

create policy "Users can insert their own chats"
  on public.chats for insert with check (auth.uid() = user_id);

create policy "Users can update their own chats"
  on public.chats for update using (auth.uid() = user_id);

create policy "Users can delete their own chats"
  on public.chats for delete using (auth.uid() = user_id);

-- Create chat_messages table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on chat_messages
alter table public.chat_messages enable row level security;

-- RLS policies for chat_messages
create policy "Users can view messages in their chats"
  on public.chat_messages for select
  using (exists (
    select 1 from public.chats where chats.id = chat_messages.chat_id and chats.user_id = auth.uid()
  ));

create policy "Users can insert messages in their chats"
  on public.chat_messages for insert
  with check (exists (
    select 1 from public.chats where chats.id = chat_messages.chat_id and chats.user_id = auth.uid()
  ));

-- Create indexes for faster queries
create index idx_chats_user_id_updated_at on public.chats(user_id, updated_at desc);
create index idx_chat_messages_chat_id_created_at on public.chat_messages(chat_id, created_at);

-- Create word_pairs table for flashcard deck
create table public.word_pairs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_word text not null,
  translated_word text not null,
  context_sentence text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, source_word, translated_word)
);

-- Enable RLS on word_pairs
alter table public.word_pairs enable row level security;

-- RLS policies for word_pairs
create policy "Users can view their own word pairs"
  on public.word_pairs for select using (auth.uid() = user_id);

create policy "Users can insert their own word pairs"
  on public.word_pairs for insert with check (auth.uid() = user_id);

create policy "Users can update their own word pairs"
  on public.word_pairs for update using (auth.uid() = user_id);

create policy "Users can delete their own word pairs"
  on public.word_pairs for delete using (auth.uid() = user_id);

-- Create index for faster word pair queries
create index idx_word_pairs_user_id on public.word_pairs(user_id);
