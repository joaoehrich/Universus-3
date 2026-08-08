-- =====================================================================
-- Partida ao vivo (multiplayer) - Universus
--
-- O professor abre uma SALA a partir de um quiz. Os alunos entram com o
-- codigo da sala, esperam no lobby e respondem as perguntas ao mesmo
-- tempo. Tudo o que decide pontuacao roda aqui no banco (SECURITY
-- DEFINER) para o aluno nunca precisar ler alternativas.correta.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table if not exists public.salas (
  id                   uuid primary key default gen_random_uuid(),
  quiz_id              uuid not null references public.quizzes(id) on delete cascade,
  host_id              uuid not null references public.profiles(id) on delete cascade,
  codigo               text not null unique,
  estado               text not null default 'lobby'
                       check (estado in ('lobby', 'pergunta', 'revelacao', 'encerrada')),
  pergunta_index       int not null default 0,
  total_perguntas      int not null default 0,
  tempo_por_pergunta   int not null default 30,
  pergunta_iniciada_em timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists salas_codigo_idx on public.salas (codigo);


create table if not exists public.sala_jogadores (
  id            uuid primary key default gen_random_uuid(),
  sala_id       uuid not null references public.salas(id) on delete cascade,
  player_id     uuid not null references public.profiles(id) on delete cascade,
  nome          text not null,
  pontos        int not null default 0,
  acertos       int not null default 0,
  streak        int not null default 0,
  melhor_streak int not null default 0,
  entrou_em     timestamptz not null default now(),
  unique (sala_id, player_id)
);

create index if not exists sala_jogadores_sala_idx on public.sala_jogadores (sala_id);


create table if not exists public.sala_respostas (
  id             uuid primary key default gen_random_uuid(),
  sala_id        uuid not null references public.salas(id) on delete cascade,
  jogador_id     uuid not null references public.sala_jogadores(id) on delete cascade,
  pergunta_id    uuid not null references public.perguntas(id) on delete cascade,
  pergunta_index int not null,
  alternativa_id uuid references public.alternativas(id) on delete set null,
  correta        boolean not null default false,
  tempo_ms       int not null default 0,
  pontos         int not null default 0,
  respondida_em  timestamptz not null default now(),
  unique (jogador_id, pergunta_index)
);

create index if not exists sala_respostas_sala_idx on public.sala_respostas (sala_id, pergunta_index);


-- ---------------------------------------------------------------------
-- RLS: leitura liberada para autenticados (o lobby e o placar sao
-- publicos dentro da sala). Toda escrita passa pelas funcoes abaixo.
-- ---------------------------------------------------------------------

alter table public.salas          enable row level security;
alter table public.sala_jogadores enable row level security;
alter table public.sala_respostas enable row level security;

drop policy if exists salas_select on public.salas;
create policy salas_select on public.salas
  for select to authenticated using (true);

drop policy if exists salas_delete_host on public.salas;
create policy salas_delete_host on public.salas
  for delete to authenticated using (host_id = auth.uid());

drop policy if exists sala_jogadores_select on public.sala_jogadores;
create policy sala_jogadores_select on public.sala_jogadores
  for select to authenticated using (true);

drop policy if exists sala_respostas_select on public.sala_respostas;
create policy sala_respostas_select on public.sala_respostas
  for select to authenticated using (true);


-- ---------------------------------------------------------------------
-- Realtime: o front escuta salas (estado da partida) e sala_jogadores
-- (lobby + placar ao vivo).
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'salas'
  ) then
    alter publication supabase_realtime add table public.salas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sala_jogadores'
  ) then
    alter publication supabase_realtime add table public.sala_jogadores;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sala_respostas'
  ) then
    alter publication supabase_realtime add table public.sala_respostas;
  end if;
end
$$;


-- ---------------------------------------------------------------------
-- criar_sala: o professor abre a sala de um quiz dele (ou de um quiz
-- publico). Gera um codigo curto e unico, no mesmo estilo do
-- access_code usado em criar_quiz_completo.
-- ---------------------------------------------------------------------

create or replace function public.criar_sala(p_quiz_id uuid)
returns public.salas
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quiz   public.quizzes;
  v_sala   public.salas;
  v_codigo text;
  v_total  int;
  v_tentativas int := 0;
begin
  if auth.uid() is null then
    raise exception 'Voce precisa estar logado para abrir uma sala.';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;

  if v_quiz.id is null then
    raise exception 'Quiz nao encontrado.';
  end if;

  if v_quiz.creator_id <> auth.uid() and v_quiz.visibilidade <> 'publico' then
    raise exception 'Esse quiz e privado. Peca ao criador para abrir a sala.';
  end if;

  select count(*) into v_total
    from public.quiz_perguntas
   where quiz_id = p_quiz_id;

  if v_total = 0 then
    raise exception 'Esse quiz ainda nao tem perguntas.';
  end if;

  -- Codigo de 6 caracteres sem letras/numeros ambiguos (0/O, 1/I).
  loop
    v_tentativas := v_tentativas + 1;

    select string_agg(
             substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                    floor(random() * 32 + 1)::int, 1), '')
      into v_codigo
      from generate_series(1, 6);

    exit when not exists (select 1 from public.salas where codigo = v_codigo);

    if v_tentativas > 50 then
      raise exception 'Nao foi possivel gerar um codigo de sala. Tente de novo.';
    end if;
  end loop;

  insert into public.salas (
    quiz_id, host_id, codigo, total_perguntas, tempo_por_pergunta
  )
  values (
    p_quiz_id, auth.uid(), v_codigo, v_total, coalesce(v_quiz.time_per_question, 30)
  )
  returning * into v_sala;

  return v_sala;
end;
$$;


-- ---------------------------------------------------------------------
-- entrar_sala: aluno entra pelo codigo. Se ja estiver na sala, apenas
-- volta para ela (permite recarregar a pagina no meio da partida).
-- ---------------------------------------------------------------------

create or replace function public.entrar_sala(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala    public.salas;
  v_jogador public.sala_jogadores;
  v_nome    text;
begin
  if auth.uid() is null then
    raise exception 'Voce precisa estar logado para entrar em uma sala.';
  end if;

  select * into v_sala
    from public.salas
   where codigo = upper(trim(p_codigo));

  if v_sala.id is null then
    raise exception 'Sala nao encontrada. Confira o codigo.';
  end if;

  if v_sala.estado = 'encerrada' then
    raise exception 'Essa partida ja foi encerrada.';
  end if;

  if v_sala.host_id = auth.uid() then
    raise exception 'Voce e o anfitriao dessa sala. Use a tela de controle.';
  end if;

  select * into v_jogador
    from public.sala_jogadores
   where sala_id = v_sala.id and player_id = auth.uid();

  if v_jogador.id is null then
    if v_sala.estado <> 'lobby' then
      raise exception 'A partida ja comecou. Peca uma nova sala ao professor.';
    end if;

    select name into v_nome from public.profiles where id = auth.uid();

    insert into public.sala_jogadores (sala_id, player_id, nome)
    values (v_sala.id, auth.uid(), coalesce(nullif(trim(v_nome), ''), 'Explorador'))
    returning * into v_jogador;
  end if;

  return jsonb_build_object(
    'sala_id',    v_sala.id,
    'jogador_id', v_jogador.id,
    'codigo',     v_sala.codigo
  );
end;
$$;


-- ---------------------------------------------------------------------
-- pergunta_da_sala: devolve a pergunta atual. As alternativas so vem
-- com o campo "correta" preenchido para o anfitriao ou depois que a
-- resposta foi revelada.
-- ---------------------------------------------------------------------

create or replace function public.pergunta_da_sala(p_sala_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala    public.salas;
  v_qp      record;
  v_revelar boolean;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  select qp.pergunta_id,
         p.enunciado,
         p.explicacao,
         p.imagem_url,
         coalesce(qp.tempo_limite, v_sala.tempo_por_pergunta) as tempo
    into v_qp
    from public.quiz_perguntas qp
    join public.perguntas p on p.id = qp.pergunta_id
   where qp.quiz_id = v_sala.quiz_id
   order by qp.ordem, p.created_at
  offset v_sala.pergunta_index
   limit 1;

  if v_qp.pergunta_id is null then
    return null;
  end if;

  v_revelar := v_sala.estado = 'revelacao' or v_sala.host_id = auth.uid();

  return jsonb_build_object(
    'pergunta_id',  v_qp.pergunta_id,
    'index',        v_sala.pergunta_index,
    'total',        v_sala.total_perguntas,
    'enunciado',    v_qp.enunciado,
    'imagem_url',   v_qp.imagem_url,
    'explicacao',   case when v_sala.estado = 'revelacao' then v_qp.explicacao end,
    'tempo',        v_qp.tempo,
    'iniciada_em',  v_sala.pergunta_iniciada_em,
    'estado',       v_sala.estado,
    'alternativas', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',      a.id,
                 'texto',   a.texto,
                 'ordem',   a.ordem,
                 'correta', case when v_revelar then a.correta end
               )
               order by a.ordem
             )
        from public.alternativas a
       where a.pergunta_id = v_qp.pergunta_id
    ), '[]'::jsonb)
  );
end;
$$;


-- ---------------------------------------------------------------------
-- iniciar_partida / revelar_resposta / proxima_pergunta: controles do
-- anfitriao. Cada um so muda o estado da sala; o Realtime avisa todo
-- mundo.
-- ---------------------------------------------------------------------

create or replace function public.iniciar_partida(p_sala_id uuid)
returns public.salas
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala public.salas;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  if v_sala.host_id <> auth.uid() then
    raise exception 'So quem abriu a sala pode iniciar a partida.';
  end if;

  if not exists (select 1 from public.sala_jogadores where sala_id = p_sala_id) then
    raise exception 'Espere pelo menos um jogador entrar.';
  end if;

  update public.salas
     set estado               = 'pergunta',
         pergunta_index       = 0,
         pergunta_iniciada_em = now()
   where id = p_sala_id
  returning * into v_sala;

  return v_sala;
end;
$$;


create or replace function public.revelar_resposta(p_sala_id uuid)
returns public.salas
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala public.salas;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  if v_sala.host_id <> auth.uid() then
    raise exception 'So quem abriu a sala pode revelar a resposta.';
  end if;

  if v_sala.estado <> 'pergunta' then
    return v_sala;
  end if;

  update public.salas
     set estado = 'revelacao'
   where id = p_sala_id
  returning * into v_sala;

  return v_sala;
end;
$$;


create or replace function public.proxima_pergunta(p_sala_id uuid)
returns public.salas
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala public.salas;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  if v_sala.host_id <> auth.uid() then
    raise exception 'So quem abriu a sala pode avancar.';
  end if;

  if v_sala.pergunta_index + 1 >= v_sala.total_perguntas then
    perform public.encerrar_partida(p_sala_id);

    select * into v_sala from public.salas where id = p_sala_id;
    return v_sala;
  end if;

  update public.salas
     set estado               = 'pergunta',
         pergunta_index       = pergunta_index + 1,
         pergunta_iniciada_em = now()
   where id = p_sala_id
  returning * into v_sala;

  return v_sala;
end;
$$;


-- ---------------------------------------------------------------------
-- responder_pergunta: unica porta de entrada da resposta do aluno.
--
-- Pontuacao:
--   base           = 100
--   bonus de tempo = ate +100, proporcional ao tempo que sobrou
--   combo          = 1.0x + 0.2x por acerto seguido, ate 2.0x
-- ---------------------------------------------------------------------

create or replace function public.responder_pergunta(
  p_sala_id        uuid,
  p_alternativa_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala       public.salas;
  v_jog        public.sala_jogadores;
  v_pergunta_id uuid;
  v_tempo      int;
  v_limite_ms  int;
  v_ms         int;
  v_correta    boolean := false;
  v_correta_id uuid;
  v_bonus      int := 0;
  v_mult       numeric := 1;
  v_pontos     int := 0;
  v_streak     int;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  if v_sala.estado <> 'pergunta' then
    raise exception 'A pergunta nao esta aberta para respostas.';
  end if;

  select * into v_jog
    from public.sala_jogadores
   where sala_id = p_sala_id and player_id = auth.uid();

  if v_jog.id is null then
    raise exception 'Voce nao esta nesta sala.';
  end if;

  if exists (
    select 1 from public.sala_respostas
     where jogador_id = v_jog.id and pergunta_index = v_sala.pergunta_index
  ) then
    raise exception 'Voce ja respondeu esta pergunta.';
  end if;

  select qp.pergunta_id, coalesce(qp.tempo_limite, v_sala.tempo_por_pergunta)
    into v_pergunta_id, v_tempo
    from public.quiz_perguntas qp
   where qp.quiz_id = v_sala.quiz_id
   order by qp.ordem
  offset v_sala.pergunta_index
   limit 1;

  if v_pergunta_id is null then
    raise exception 'Pergunta nao encontrada.';
  end if;

  select a.id into v_correta_id
    from public.alternativas a
   where a.pergunta_id = v_pergunta_id and a.correta
   limit 1;

  v_limite_ms := greatest(1, v_tempo) * 1000;
  v_ms := greatest(
    0,
    (extract(epoch from (now() - coalesce(v_sala.pergunta_iniciada_em, now()))) * 1000)::int
  );

  if p_alternativa_id is not null then
    select a.correta into v_correta
      from public.alternativas a
     where a.id = p_alternativa_id and a.pergunta_id = v_pergunta_id;

    v_correta := coalesce(v_correta, false);
  end if;

  -- 1,5s de tolerancia para latencia de rede; passou disso nao pontua.
  if v_ms > v_limite_ms + 1500 then
    v_correta := false;
  end if;

  if v_correta then
    v_bonus  := round(100.0 * (v_limite_ms - least(v_ms, v_limite_ms)) / v_limite_ms)::int;
    v_mult   := least(2.0, 1.0 + 0.2 * v_jog.streak);
    v_pontos := round((100 + v_bonus) * v_mult)::int;
    v_streak := v_jog.streak + 1;
  else
    v_streak := 0;
  end if;

  insert into public.sala_respostas (
    sala_id, jogador_id, pergunta_id, pergunta_index,
    alternativa_id, correta, tempo_ms, pontos
  )
  values (
    p_sala_id, v_jog.id, v_pergunta_id, v_sala.pergunta_index,
    p_alternativa_id, v_correta, v_ms, v_pontos
  );

  update public.sala_jogadores
     set pontos        = pontos + v_pontos,
         acertos       = acertos + case when v_correta then 1 else 0 end,
         streak        = v_streak,
         melhor_streak = greatest(melhor_streak, v_streak)
   where id = v_jog.id;

  return jsonb_build_object(
    'correta',       v_correta,
    'pontos',        v_pontos,
    'bonus_tempo',   v_bonus,
    'multiplicador', v_mult,
    'streak',        v_streak,
    'correta_id',    v_correta_id,
    'tempo_ms',      v_ms,
    'total_pontos',  v_jog.pontos + v_pontos
  );
end;
$$;


-- ---------------------------------------------------------------------
-- encerrar_partida: fecha a sala, grava um quiz_attempts por jogador e
-- converte os pontos da partida em XP/nivel no perfil.
-- ---------------------------------------------------------------------

create or replace function public.encerrar_partida(p_sala_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala public.salas;
  v_jog  record;
  v_xp   int;
begin
  select * into v_sala from public.salas where id = p_sala_id;

  if v_sala.id is null then
    raise exception 'Sala nao encontrada.';
  end if;

  if v_sala.host_id <> auth.uid() then
    raise exception 'So quem abriu a sala pode encerrar a partida.';
  end if;

  if v_sala.estado = 'encerrada' then
    return jsonb_build_object('ok', true, 'ja_encerrada', true);
  end if;

  for v_jog in
    select * from public.sala_jogadores where sala_id = p_sala_id
  loop
    v_xp := greatest(0, round(v_jog.pontos / 10.0)::int);

    insert into public.quiz_attempts (
      quiz_id, student_id, score, total_questions, correct_answers,
      status, pergunta_atual_index, completed_at
    )
    values (
      v_sala.quiz_id, v_jog.player_id, v_jog.pontos, v_sala.total_perguntas, v_jog.acertos,
      'concluido', v_sala.total_perguntas, now()
    );

    update public.profiles
       set xp    = xp + v_xp,
           nivel = greatest(1, floor((xp + v_xp) / 500.0)::int + 1)
     where id = v_jog.player_id;
  end loop;

  update public.salas
     set estado = 'encerrada'
   where id = p_sala_id;

  return jsonb_build_object('ok', true);
end;
$$;
