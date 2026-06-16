-- Run this in your Supabase SQL Editor.
-- Supabase is only an encrypted package relay for counterparty handoff.
-- GenLayer remains the source of truth for pact/payment/dispute/reveal state.

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
  expires_at      timestamptz  not null default (now() + interval '7 days'),
  used_at         timestamptz,
  created_at      timestamptz  not null default now()
);

alter table shared_pacts enable row level security;

alter table shared_pacts
  alter column expires_at set default (now() + interval '7 days');

update shared_pacts
  set expires_at = now() + interval '7 days'
  where expires_at is null;

alter table shared_pacts
  alter column expires_at set not null;

create policy "allow_insert_shared_pacts" on shared_pacts
  for insert with check (true);

create policy "allow_select_shared_pacts" on shared_pacts
  for select using (true);

drop policy if exists "allow_update_shared_pacts" on shared_pacts;

-- No public update policy.
-- If updates are needed later, add a creator_write_token_hash flow. Do not
-- allow anonymous users to update arbitrary share rows.
