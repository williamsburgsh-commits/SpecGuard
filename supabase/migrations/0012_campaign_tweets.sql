-- StayInSpec campaign submissions (public leaderboard)

create table public.campaign_tweets (
  tweet_id text primary key,
  wallet text not null,
  tweet_url text not null,
  likes int not null default 0 check (likes >= 0),
  retweets int not null default 0 check (retweets >= 0),
  replies int not null default 0 check (replies >= 0),
  points numeric(14,1) not null check (points >= 0),
  submitted_at timestamptz not null default now(),
  metrics_updated_at timestamptz not null default now()
);

create index campaign_tweets_wallet_idx on public.campaign_tweets (wallet);
create index campaign_tweets_metrics_updated_idx on public.campaign_tweets (metrics_updated_at);

alter table public.campaign_tweets enable row level security;

create policy anon_select_campaign_tweets
  on public.campaign_tweets
  for select
  to anon, authenticated
  using (true);

create table public.campaign_state (
  id text primary key,
  frozen_at timestamptz
);

alter table public.campaign_state enable row level security;

create policy anon_select_campaign_state
  on public.campaign_state
  for select
  to anon, authenticated
  using (true);

insert into public.campaign_state (id) values ('stayinspec');
