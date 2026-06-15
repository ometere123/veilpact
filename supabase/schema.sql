-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/jpiefpceuiteizsuorvq/sql)

create table if not exists shared_pacts (
  id              uuid primary key default gen_random_uuid(),
  encrypted_pkg   jsonb        not null,
  agreement_root  text         not null,
  metadata_hash   text         not null,
  on_chain_id     integer,
  party_a         text         not null,
  party_b         text         not null,
  clause_count    integer      not null default 0,
  payment_enabled boolean      not null default false,
  created_at      timestamptz  not null default now()
);

-- Row-level security: anyone can insert and read (the blob is AES-256 encrypted;
-- the key is never stored — it only travels in the URL #fragment).
alter table shared_pacts enable row level security;

create policy "allow_insert" on shared_pacts
  for insert with check (true);

create policy "allow_select" on shared_pacts
  for select using (true);

create policy "allow_update_on_chain_id" on shared_pacts
  for update using (true) with check (true);
