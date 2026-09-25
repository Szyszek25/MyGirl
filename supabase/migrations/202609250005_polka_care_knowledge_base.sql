-- Polka Care knowledge base model.
-- This migration is stored in the repo and is not applied remotely by this commit.
-- Articles are editorial content. Cycle tracker data stays in the separate owner-only tables.

create table public.care_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category text not null check (char_length(category) between 2 and 60),
  title text not null check (char_length(title) between 4 and 160),
  summary text not null check (char_length(summary) <= 500),
  body jsonb not null default '[]'::jsonb,
  icon text check (char_length(icon) <= 80),
  is_published boolean not null default false,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.care_articles(id) on delete cascade,
  source_name text not null check (char_length(source_name) <= 120),
  source_url text not null check (char_length(source_url) <= 1000),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index care_articles_published_idx
  on public.care_articles(is_published, published_at desc);
create index care_article_sources_article_idx
  on public.care_article_sources(article_id, sort_order);

alter table public.care_articles enable row level security;
alter table public.care_article_sources enable row level security;

-- Users can only read reviewed/published editorial content.
create policy care_articles_read_published
on public.care_articles for select to authenticated
using (is_published = true);

create policy care_sources_read_published
on public.care_article_sources for select to authenticated
using (
  exists (
    select 1
    from public.care_articles a
    where a.id = article_id
      and a.is_published = true
  )
);

-- Intentionally no INSERT/UPDATE/DELETE policy for normal authenticated users.
-- Editorial writes should happen through a trusted admin/backend workflow only.
-- Do not join care_articles to private cycle_entries for personalization on the server.
