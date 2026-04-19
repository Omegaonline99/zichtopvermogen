# Supabase MVP setup

## 1) Benodigde tabel
Gebruik in Supabase SQL Editor:

```sql
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_class text not null,
  current_value numeric not null,
  purchase_value numeric,
  purchase_date date,
  notes text,
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "users_select_own_assets"
on public.assets for select
using (auth.uid() = user_id);

create policy "users_insert_own_assets"
on public.assets for insert
with check (auth.uid() = user_id);

create policy "users_update_own_assets"
on public.assets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users_delete_own_assets"
on public.assets for delete
using (auth.uid() = user_id);
```

## 2) User-assets relatie
- `auth.users` bevat de ingelogde users (Supabase Auth).
- `assets.user_id` verwijst naar `auth.users.id`.
- Elke query filtert op `user_id = current user`.
- Dankzij RLS kan een user alleen eigen records lezen/schrijven.

## 3) Environment/config variabelen
Voor deze eenvoudige frontend (zonder build tool):

1. Kopieer `config.example.js` naar `config.js`.
2. Vul:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

> Gebruik alleen de **anon key** in frontend. Nooit service role keys in browsercode.
