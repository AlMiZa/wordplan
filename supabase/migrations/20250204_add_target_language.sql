-- Add target_language column to profiles table
alter table public.profiles
  add column target_language text
    check (target_language in ('polish', 'belarusian', 'italian'));

-- Update trigger to initialize target_language as NULL
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, context, target_language)
  values (new.id, null, null);
  return new;
end;
$$ language plpgsql security definer;
