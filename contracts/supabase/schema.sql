-- =====================================================
-- SOAPY MINERS — SUPABASE SCHEMA
--
-- Run this in the Supabase SQL editor.
-- The blockchain remains the source of truth.
-- Supabase is INDEX / CACHE / HISTORY / ANALYTICS only.
-- =====================================================


-- =====================================================
-- REWARD MINES
-- =====================================================

create table if not exists reward_mines (
  id bigserial primary key,

  chain_mine_id bigint not null,
  contract_address text not null,

  name text,

  status text not null default 'CREATED',

  max_health bigint not null default 0,
  current_health bigint not null default 0,

  current_reward_pool numeric not null default 0,
  final_reward_pool numeric not null default 0,

  total_damage bigint not null default 0,

  attack_fee_gd bigint not null default 0,
  rest_seconds bigint not null default 0,
  cooldown_seconds bigint not null default 0,

  created_tx text,
  created_block bigint,

  activated_at timestamptz,
  paused_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,

  updated_block bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(contract_address, chain_mine_id)
);


-- =====================================================
-- REWARD ATTACKS (immutable history)
-- =====================================================

create table if not exists reward_attacks (
  id bigserial primary key,

  contract_address text not null,
  chain_mine_id bigint not null,

  player_wallet text not null,
  token_id bigint not null,

  damage bigint not null,
  remaining_health bigint not null,

  tx_hash text not null,
  log_index integer,
  block_number bigint not null,
  block_timestamp timestamptz,

  created_at timestamptz not null default now(),

  unique(tx_hash, log_index)
);


-- =====================================================
-- REWARD PLAYER AGGREGATES
-- =====================================================

create table if not exists reward_players (
  id bigserial primary key,

  contract_address text not null,
  chain_mine_id bigint not null,
  player_wallet text not null,

  total_damage bigint not null default 0,
  attack_count bigint not null default 0,

  last_attack_at timestamptz,
  last_token_id bigint,

  updated_at timestamptz not null default now(),

  unique(
    contract_address,
    chain_mine_id,
    player_wallet
  )
);


-- =====================================================
-- PER-MINER REWARD MINE HISTORY
-- (derived from reward_attacks)
-- =====================================================

create table if not exists reward_miners (
  id bigserial primary key,

  contract_address text not null,
  chain_mine_id bigint not null,
  token_id bigint not null,

  player_wallet text,

  total_damage bigint not null default 0,
  attack_count bigint not null default 0,

  last_attack_at timestamptz,

  updated_at timestamptz not null default now(),

  unique(
    contract_address,
    chain_mine_id,
    token_id
  )
);


-- =====================================================
-- REWARD CLAIMS
-- =====================================================

create table if not exists reward_claims (
  id bigserial primary key,

  contract_address text not null,
  chain_mine_id bigint not null,

  player_wallet text not null,
  amount_quai numeric not null,

  tx_hash text not null,
  log_index integer,
  block_number bigint not null,
  claimed_at timestamptz,

  created_at timestamptz not null default now(),

  unique(tx_hash, log_index)
);


-- =====================================================
-- MARKETPLACE LISTINGS
-- =====================================================

create table if not exists marketplace_listings (
  id bigserial primary key,

  contract_address text not null,
  chain_listing_id bigint not null,

  seller_wallet text not null,
  seller_token_id bigint,

  resource_type smallint not null,

  amount bigint not null,
  price_gd numeric not null,

  status text not null default 'ACTIVE',

  buyer_wallet text,
  buyer_token_id bigint,
  return_token_id bigint,

  created_tx text,
  sold_tx text,
  cancelled_tx text,

  created_block bigint,
  updated_block bigint,

  created_at timestamptz not null default now(),
  sold_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),

  unique(
    contract_address,
    chain_listing_id
  )
);


-- =====================================================
-- MARKETPLACE SALES
-- =====================================================

create table if not exists marketplace_sales (
  id bigserial primary key,

  contract_address text not null,
  chain_listing_id bigint not null,

  seller_wallet text not null,
  buyer_wallet text not null,

  buyer_token_id bigint,

  resource_type smallint not null,
  amount bigint not null,

  price_gd numeric not null,
  fee_gd numeric not null,

  tx_hash text not null,
  log_index integer,
  block_number bigint not null,

  sold_at timestamptz,

  created_at timestamptz not null default now(),

  unique(tx_hash, log_index)
);


-- =====================================================
-- EXPEDITIONS (normal mining)
-- =====================================================

create table if not exists expeditions (
  id bigserial primary key,

  game_contract_address text not null,

  token_id bigint not null,
  player_wallet text not null,
  mine_id bigint not null,

  status text not null default 'MINING',

  started_at timestamptz,
  ends_at timestamptz,
  claimed_at timestamptz,

  ore bigint not null default 0,
  crystal bigint not null default 0,
  core bigint not null default 0,
  xp bigint not null default 0,

  start_tx text,
  claim_tx text,

  start_block bigint,
  claim_block bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  expeditions_start_tx_token_idx
on expeditions (
  start_tx,
  token_id
);


-- =====================================================
-- GAME ACTIVITY (general feed)
-- =====================================================

create table if not exists game_activity (
  id bigserial primary key,

  event_id text,

  wallet text,
  token_id bigint,

  activity_type text not null,

  contract_address text,
  tx_hash text,
  log_index integer,

  block_number bigint,
  block_timestamp timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists
  game_activity_event_id_idx
on game_activity (
  event_id
);


-- =====================================================
-- REWARD ATTACK SIGNATURES (off-chain issued-signature log)
--
-- NOT blockchain authority. Used for:
--   - rate limiting the damage-signer endpoint
--   - debugging / issued-signature tracking
--   - abuse detection / analytics
--
-- The contract remains authoritative for attack validity
-- (nonce, deadline, signature all verified on-chain).
-- =====================================================

create table if not exists reward_attack_signatures (
  id bigserial primary key,

  contract_address text not null,
  chain_mine_id bigint not null,

  player_wallet text not null,
  token_id bigint not null,

  nonce numeric not null,
  damage bigint not null,

  min_damage bigint not null,
  max_damage bigint not null,

  deadline bigint not null,

  status text not null default 'ISSUED',

  tx_hash text,

  issued_at timestamptz not null default now(),
  submitted_at timestamptz,
  confirmed_at timestamptz,

  unique(
    contract_address,
    token_id,
    nonce
  )
);


create index if not exists
  reward_attack_signatures_wallet_idx
on reward_attack_signatures (
  player_wallet,
  issued_at desc
);


create index if not exists
  reward_attack_signatures_token_idx
on reward_attack_signatures (
  token_id,
  issued_at desc
);


create index if not exists
  reward_attack_signatures_mine_idx
on reward_attack_signatures (
  contract_address,
  chain_mine_id,
  issued_at desc
);


-- =====================================================
-- INDEXER CHECKPOINT
-- =====================================================

create table if not exists indexer_state (
  id bigserial primary key,

  network text not null,
  contract_address text not null,

  contract_type text not null,

  last_processed_block bigint not null default 0,

  updated_at timestamptz not null default now(),

  unique(
    network,
    contract_address
  )
);


-- =====================================================
-- QUERY INDEXES
-- =====================================================

create index if not exists
  reward_attacks_mine_idx
on reward_attacks (
  contract_address,
  chain_mine_id,
  block_number desc
);

create index if not exists
  reward_players_leaderboard_idx
on reward_players (
  contract_address,
  chain_mine_id,
  total_damage desc
);

create index if not exists
  reward_miners_token_idx
on reward_miners (
  token_id
);

create index if not exists
  reward_claims_wallet_idx
on reward_claims (
  player_wallet,
  claimed_at desc
);

create index if not exists
  market_active_idx
on marketplace_listings (
  contract_address,
  status,
  created_at desc
);

create index if not exists
  market_seller_idx
on marketplace_listings (
  seller_wallet,
  created_at desc
);

create index if not exists
  expedition_wallet_idx
on expeditions (
  player_wallet,
  created_at desc
);

create index if not exists
  expedition_token_idx
on expeditions (
  token_id,
  created_at desc
);

create index if not exists
  activity_wallet_idx
on game_activity (
  wallet,
  created_at desc
);


-- =====================================================
-- MIGRATION: game_activity event identity
--
-- Safe to re-run on existing deployments.
-- Adds the universal event_id used for
-- idempotent activity inserts.
-- =====================================================

alter table game_activity
add column if not exists log_index integer;

alter table game_activity
add column if not exists event_id text;

create unique index if not exists
  game_activity_event_id_idx
on game_activity (
  event_id
);
