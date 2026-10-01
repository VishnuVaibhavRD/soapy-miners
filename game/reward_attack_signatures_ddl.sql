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
