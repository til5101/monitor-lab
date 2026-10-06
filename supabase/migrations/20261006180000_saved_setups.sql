-- Saved setups for signed-in users. Each row is one named comparison,
-- stored in the same ml_* format as a share link so it can be reopened as one.

create table public.saved_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  params text not null check (char_length(params) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_setups_user_idx on public.saved_setups (user_id, updated_at desc);

create or replace function public.set_saved_setups_updated_at() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger saved_setups_set_updated_at before update on public.saved_setups for each row execute function public.set_saved_setups_updated_at();

alter table public.saved_setups enable row level security;
revoke all on public.saved_setups from anon, authenticated;
grant select, insert, update, delete on public.saved_setups to authenticated;

create policy "Users can view their saved setups" on public.saved_setups for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can save setups" on public.saved_setups for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can rename their saved setups" on public.saved_setups for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can remove their saved setups" on public.saved_setups for delete to authenticated using ((select auth.uid()) = user_id);

-- Lets a signed-in user delete their own account. Favourites and setups go with it (on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
