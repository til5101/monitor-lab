-- Baseline: the live schema as of 6 Oct 2026 (catalogue, offers, favourites).
-- Applied to a fresh project to make it match live. Already present on live.

create table public.monitor_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  display_name text,
  size_inches numeric not null check (size_inches > 0 and size_inches < 100),
  resolution_x integer not null check (resolution_x > 0),
  resolution_y integer not null check (resolution_y > 0),
  refresh_hz numeric check (refresh_hz is null or refresh_hz > 0),
  panel_type text,
  aspect_ratio text,
  curved boolean not null default false,
  curvature_r integer check (curvature_r is null or curvature_r > 0),
  aliases text[] not null default '{}'::text[],
  manufacturer_url text,
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hdmi_ports integer,
  hdmi_version text,
  displayport_ports integer,
  displayport_version text,
  displayport_out_ports integer,
  usb_c_ports integer,
  usb_c_video boolean,
  usb_c_power_delivery_w integer,
  thunderbolt_ports integer,
  thunderbolt_version text,
  usb_a_ports integer,
  usb_b_upstream_ports integer,
  ethernet boolean,
  ethernet_speed_mbps integer,
  audio_out boolean,
  kvm boolean,
  speakers boolean,
  speaker_power_w numeric,
  webcam boolean,
  webcam_pop_up boolean,
  webcam_resolution text,
  microphone boolean,
  vesa_mount boolean,
  vesa_width_mm integer,
  vesa_height_mm integer,
  width_mm numeric,
  panel_height_mm numeric,
  height_with_stand_min_mm numeric,
  height_with_stand_max_mm numeric,
  depth_with_stand_mm numeric,
  webcam_extended_height_mm numeric,
  physical_dimensions_verified boolean not null default false,
  features_verified boolean not null default false,
  feature_notes text,
  image_url text,
  constraint monitor_models_brand_model_unique unique (brand, model)
);
create index monitor_models_active_idx on public.monitor_models (active);
create index monitor_models_brand_idx on public.monitor_models (brand);
create index monitor_models_model_idx on public.monitor_models (model);
create index monitor_models_resolution_idx on public.monitor_models (resolution_x, resolution_y);
create index monitor_models_size_idx on public.monitor_models (size_inches);

create table public.monitor_offers (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitor_models (id) on delete cascade,
  retailer text not null,
  retailer_product_id text,
  product_url text not null,
  affiliate_url text,
  price_gbp numeric check (price_gbp is null or price_gbp >= 0),
  currency text not null default 'GBP' check (currency = 'GBP'),
  in_stock boolean,
  availability_text text,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitor_offers_unique_source unique (monitor_id, retailer, product_url)
);
create index monitor_offers_monitor_idx on public.monitor_offers (monitor_id);
create index monitor_offers_active_idx on public.monitor_offers (active);
create index monitor_offers_price_idx on public.monitor_offers (price_gbp);
create index monitor_offers_stock_idx on public.monitor_offers (in_stock);
create index monitor_offers_checked_idx on public.monitor_offers (last_checked_at desc);

create table public.saved_monitors (
  user_id uuid not null references auth.users (id) on delete cascade,
  monitor_id uuid not null references public.monitor_models (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, monitor_id)
);
create index saved_monitors_user_created_idx on public.saved_monitors (user_id, created_at desc);
create index saved_monitors_monitor_idx on public.saved_monitors (monitor_id);

create or replace function public.set_monitor_models_updated_at() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create or replace function public.set_monitor_offers_updated_at() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger monitor_models_set_updated_at before update on public.monitor_models for each row execute function public.set_monitor_models_updated_at();
create trigger monitor_offers_set_updated_at before update on public.monitor_offers for each row execute function public.set_monitor_offers_updated_at();

-- Access: the public can only read active rows; signed-in users manage their own favourites.
alter table public.monitor_models enable row level security;
alter table public.monitor_offers enable row level security;
alter table public.saved_monitors enable row level security;

revoke all on public.monitor_models, public.monitor_offers, public.saved_monitors from anon, authenticated;
grant select on public.monitor_models, public.monitor_offers to anon, authenticated;
grant select, insert, delete on public.saved_monitors to authenticated;

create policy "Public can read active monitors" on public.monitor_models for select to anon, authenticated using (active = true);
create policy "Public can read active monitor offers" on public.monitor_offers for select to anon, authenticated using (active = true);
create policy "Users can view their saved monitors" on public.saved_monitors for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can save monitors" on public.saved_monitors for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can remove saved monitors" on public.saved_monitors for delete to authenticated using ((select auth.uid()) = user_id);
