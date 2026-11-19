-- Tabela de leads da Landing Page JornadaTEK (KREBS)
create table if not exists public.jornadatek_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  city text not null,
  phone text not null,
  source text not null default 'jornadatek',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  page_url text,
  referrer text,
  status text not null default 'novo'
);

create index if not exists idx_jornadatek_leads_created_at
  on public.jornadatek_leads (created_at desc);

-- LGPD: habilita RLS sem policies para anon/authenticated.
-- Apenas a Edge Function (service_role) e administradores no Dashboard acessam os dados.
alter table public.jornadatek_leads enable row level security;

-- Bucket público para mídia otimizada da landing page (vídeo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,
  array['video/mp4', 'image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Permite leitura pública dos objetos no bucket media
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for media bucket'
  ) then
    create policy "Public read access for media bucket"
      on storage.objects for select
      using (bucket_id = 'media');
  end if;
end $$;
