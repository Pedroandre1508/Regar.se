create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  drops integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  points integer not null default 0,
  position integer not null default 0
);
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cost integer not null check (cost > 0),
  emoji text not null default '🌷',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reward_id uuid references public.rewards(id) on delete set null,
  reward_name text not null,
  reward_emoji text not null default '🌷',
  cost integer not null,
  status text not null default 'pending' check (status in ('pending','delivered')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create table public.daily_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  total integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

grant select, insert, update, delete on public.questions, public.question_options, public.rewards to authenticated;
grant select, update on public.redemptions to authenticated;
grant select on public.daily_submissions to authenticated;
grant all on public.questions, public.question_options, public.rewards, public.redemptions, public.daily_submissions to service_role;

alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.daily_submissions enable row level security;

create policy "read questions" on public.questions for select to authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin questions" on public.questions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read options" on public.question_options for select to authenticated using (true);
create policy "admin options" on public.question_options for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read rewards" on public.rewards for select to authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin rewards" on public.rewards for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read redemptions" on public.redemptions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update redemptions" on public.redemptions for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read submissions" on public.daily_submissions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.submit_daily(_option_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _local timestamp := now() at time zone 'America/Sao_Paulo';
  _day date := _local::date;
  _total integer;
begin
  if _uid is null then raise exception 'Não autenticado'; end if;
  if extract(hour from _local) < 8 then raise exception 'A flor ainda está descansando. Volte às 08:00.'; end if;
  if exists (select 1 from daily_submissions where user_id = _uid and day = _day) then
    raise exception 'Jardim já regado hoje.';
  end if;
  select coalesce(sum(o.points),0) into _total
  from (select distinct on (o.question_id) o.* from question_options o
        join questions q on q.id = o.question_id and q.active
        where o.id = any(_option_ids) order by o.question_id) o;
  insert into daily_submissions (user_id, day, total) values (_uid, _day, _total);
  update profiles set drops = greatest(0, drops + _total) where id = _uid;
  return _total;
end; $$;

create or replace function public.redeem_reward(_reward_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid(); _r rewards; _bal integer;
begin
  if _uid is null then raise exception 'Não autenticado'; end if;
  select * into _r from rewards where id = _reward_id and active;
  if not found then raise exception 'Recompensa indisponível'; end if;
  select drops into _bal from profiles where id = _uid for update;
  if _bal < _r.cost then raise exception 'Gotas insuficientes'; end if;
  update profiles set drops = drops - _r.cost where id = _uid;
  insert into redemptions (user_id, reward_id, reward_name, reward_emoji, cost) values (_uid, _r.id, _r.name, _r.emoji, _r.cost);
end; $$;

create or replace function public.admin_adjust_drops(_user_id uuid, _delta integer)
returns integer language plpgsql security definer set search_path = public as $$
declare _new integer;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  update profiles set drops = greatest(0, drops + _delta) where id = _user_id returning drops into _new;
  return _new;
end; $$;

revoke execute on function public.submit_daily(uuid[]), public.redeem_reward(uuid), public.admin_adjust_drops(uuid,integer) from public, anon;
grant execute on function public.submit_daily(uuid[]), public.redeem_reward(uuid), public.admin_adjust_drops(uuid,integer) to authenticated;

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.redemptions;