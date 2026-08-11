-- =====================================================================
-- Ranking, relatorios do aluno e painel do professor - Universus
--
-- Tudo aqui e leitura agregada. Sai do banco pronto para a tela por
-- dois motivos:
--   1. o front fazia N+1 (uma query por partida so para descobrir a
--      colocacao do aluno);
--   2. o painel do professor precisa cruzar alternativas.correta, que
--      o aluno nao pode ler - entao a agregacao roda em SECURITY
--      DEFINER e cada funcao filtra pelo dono (auth.uid()) na mao.
--
-- Contrato com o front: docs/CONTRATO-RANKING-RESULTADOS.md
-- =====================================================================


-- ---------------------------------------------------------------------
-- Helper de comparacao de tema.
--
-- O banco tem "Ciências" e "Ciencias", " Matematica" e "Matematica".
-- Sem normalizar, o filtro do ranking devolveria vazio para metade das
-- escolhas do usuario. Fica em private porque nao e API.
-- ---------------------------------------------------------------------

create or replace function private.chave_tema(p_texto text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select nullif(
    btrim(translate(lower(p_texto), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')),
    ''
  )
$$;

revoke all on function private.chave_tema(text) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- Linha do ranking (uso interno).
--
-- ranking_geral e minha_posicao_ranking precisam da MESMA linha e da
-- MESMA posicao - o front reusa o componente de linha e a faixa "sua
-- posicao" tem que bater com a tabela. Entao a posicao e calculada uma
-- vez aqui, sobre o ranking inteiro, e cada RPC so recorta.
--
-- Sem filtro nenhum a fonte e sala_jogadores (placar consolidado da
-- partida). Com filtro de materia ou de periodo a fonte passa a ser
-- sala_respostas, que e a unica tabela que sabe o tema e a hora de
-- cada resposta.
-- ---------------------------------------------------------------------

create or replace function private.ranking_linhas(
  p_categoria    text,
  p_subcategoria text,
  p_periodo      text
)
returns table (
  posicao        int,
  player_id      uuid,
  nome           text,
  avatar_config  jsonb,
  nivel          int,
  xp             int,
  pontos         int,
  partidas       int,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  melhor_streak  int,
  eh_voce        boolean
)
language sql
stable
set search_path = public, pg_temp
as $$
  with modo as (
    select
      private.chave_tema(p_categoria)    as cat,
      private.chave_tema(p_subcategoria) as sub,
      case private.chave_tema(coalesce(p_periodo, 'sempre'))
        when 'semana' then now() - interval '7 days'
        when 'mes'    then now() - interval '30 days'
        else null
      end as desde
  ),
  recorte as (
    select m.cat, m.sub, m.desde,
           (m.cat is null and m.sub is null and m.desde is null) as sem_filtro
    from modo m
  ),
  respostas as (
    select sr.jogador_id as jog, sr.sala_id as sala, sr.correta as ok, sr.pontos as pts
    from public.sala_respostas sr
    join public.salas s      on s.id = sr.sala_id
    join public.quizzes qz   on qz.id = s.quiz_id
    join public.perguntas pg on pg.id = sr.pergunta_id
    cross join recorte r
    where (r.desde is null or sr.respondida_em >= r.desde)
      -- pergunta antiga pode estar sem categoria: cai para a do quiz
      and (r.cat is null or coalesce(private.chave_tema(pg.categoria), private.chave_tema(qz.category)) = r.cat)
      and (r.sub is null or coalesce(private.chave_tema(pg.subcategoria), private.chave_tema(qz.subcategoria)) = r.sub)
  ),
  por_jogador as (
    select x.jog,
           count(*)::int                     as qtd,
           count(*) filter (where x.ok)::int as ok,
           coalesce(sum(x.pts), 0)::int      as pts
    from respostas x
    group by x.jog
  ),
  totais as (
    select
      sj.player_id as pid,
      sum(case when r.sem_filtro then sj.pontos  else coalesce(pj.pts, 0) end)::int as pts,
      sum(case when r.sem_filtro then sj.acertos else coalesce(pj.ok, 0)  end)::int as ok,
      sum(coalesce(pj.qtd, 0))::int as qtd,
      count(distinct case when r.sem_filtro or coalesce(pj.qtd, 0) > 0 then sj.sala_id end)::int as salas,
      coalesce(max(case when r.sem_filtro or coalesce(pj.qtd, 0) > 0 then sj.melhor_streak end), 0)::int as streak
    from public.sala_jogadores sj
    cross join recorte r
    left join por_jogador pj on pj.jog = sj.id
    group by sj.player_id
    -- com filtro, quem nao respondeu nada no recorte fica fora
    having bool_or(r.sem_filtro) or sum(coalesce(pj.qtd, 0)) > 0
  ),
  linhas as (
    select
      t.pid,
      p.name as nome_jogador,
      coalesce(p.avatar_config, '{}'::jsonb) as avatar,
      coalesce(p.nivel, 1)::int as lvl,
      coalesce(p.xp, 0)::int    as exp,
      t.pts, t.salas, t.qtd, t.ok, t.streak,
      -- sem resposta nenhuma o aproveitamento e 0, nunca null nem divisao por zero
      case when t.qtd > 0 then round(t.ok * 100.0 / t.qtd)::int else 0 end as aprov
    from totais t
    join public.profiles p on p.id = t.pid
  )
  select
    -- empate: aproveitamento, depois nome, depois id (posicao estavel)
    row_number() over (
      order by l.pts desc, l.aprov desc, l.nome_jogador asc, l.pid asc
    )::int,
    l.pid, l.nome_jogador, l.avatar, l.lvl, l.exp, l.pts, l.salas,
    l.qtd, l.ok, l.aprov, l.streak,
    coalesce(l.pid = auth.uid(), false)
  from linhas l
$$;

revoke all on function private.ranking_linhas(text, text, text) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- Catalogo de categorias
--
-- Alimenta os <select> do ranking e as sugestoes do Criar Quiz. So
-- conta quiz que o usuario logado pode ver de verdade (publico, dele
-- mesmo ou que ele jogou): a funcao e SECURITY DEFINER, entao se
-- amanha a policy de quizzes for fechada o catalogo ja nao vaza os
-- temas privados do professor para o aluno.
-- ---------------------------------------------------------------------

create or replace function public.catalogo_categorias()
returns table (
  categoria    text,
  subcategoria text,
  quizzes      int,
  perguntas    int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with visiveis as (
    select q.id as quiz_id,
           nullif(btrim(q.category), '')     as cat,
           nullif(btrim(q.subcategoria), '') as sub
    from public.quizzes q
    where q.visibilidade = 'publico'
       or q.creator_id = auth.uid()
       or exists (
            select 1
            from public.salas s
            join public.sala_jogadores sj on sj.sala_id = s.id
            where s.quiz_id = q.id and sj.player_id = auth.uid()
          )
  ),
  -- uma pergunta pode estar em varios quizzes; conta uma vez so
  pares_pergunta as (
    select coalesce(nullif(btrim(pg.categoria), ''), v.cat) as cat,
           coalesce(nullif(btrim(pg.subcategoria), ''), v.sub) as sub
    from public.perguntas pg
    join lateral (
      select vz.cat, vz.sub
      from public.quiz_perguntas qp
      join visiveis vz on vz.quiz_id = qp.quiz_id
      where qp.pergunta_id = pg.id
      order by qp.ordem
      limit 1
    ) v on true
  ),
  tudo as (
    select v.cat, v.sub, 1 as q, 0 as p from visiveis v where v.cat is not null
    union all
    select pp.cat, pp.sub, 0, 1 from pares_pergunta pp where pp.cat is not null
  )
  select t.cat, t.sub, sum(t.q)::int, sum(t.p)::int
  from tudo t
  group by t.cat, t.sub
  order by t.cat asc, t.sub asc nulls first
$$;

revoke all on function public.catalogo_categorias() from public, anon;
grant execute on function public.catalogo_categorias() to authenticated;


-- ---------------------------------------------------------------------
-- Ranking
-- ---------------------------------------------------------------------

create or replace function public.ranking_geral(
  p_categoria    text default null,
  p_subcategoria text default null,
  p_periodo      text default 'sempre',
  p_limite       int  default 50
)
returns table (
  posicao        int,
  player_id      uuid,
  nome           text,
  avatar_config  jsonb,
  nivel          int,
  xp             int,
  pontos         int,
  partidas       int,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  melhor_streak  int,
  eh_voce        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.posicao, r.player_id, r.nome, r.avatar_config, r.nivel, r.xp,
         r.pontos, r.partidas, r.respondidas, r.acertos, r.aproveitamento,
         r.melhor_streak, r.eh_voce
  from private.ranking_linhas(p_categoria, p_subcategoria, p_periodo) r
  order by r.posicao
  -- teto de 200: o limite chega do front e ninguem renderiza mais que isso
  limit greatest(1, least(coalesce(p_limite, 50), 200))
$$;

revoke all on function public.ranking_geral(text, text, text, int) from public, anon;
grant execute on function public.ranking_geral(text, text, text, int) to authenticated;


create or replace function public.minha_posicao_ranking(
  p_categoria    text default null,
  p_subcategoria text default null,
  p_periodo      text default 'sempre'
)
returns table (
  posicao        int,
  player_id      uuid,
  nome           text,
  avatar_config  jsonb,
  nivel          int,
  xp             int,
  pontos         int,
  partidas       int,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  melhor_streak  int,
  eh_voce        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.posicao, r.player_id, r.nome, r.avatar_config, r.nivel, r.xp,
         r.pontos, r.partidas, r.respondidas, r.acertos, r.aproveitamento,
         r.melhor_streak, r.eh_voce
  from private.ranking_linhas(p_categoria, p_subcategoria, p_periodo) r
  where r.player_id = auth.uid()
$$;

revoke all on function public.minha_posicao_ranking(text, text, text) from public, anon;
grant execute on function public.minha_posicao_ranking(text, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- Visao do aluno
--
-- Sempre presa em player_id = auth.uid(): mesmo sendo SECURITY
-- DEFINER, ninguem le o historico de outro aluno por aqui.
-- ---------------------------------------------------------------------

create or replace function public.meu_historico(p_limite int default 100)
returns table (
  sala_id         uuid,
  codigo          text,
  estado          text,
  jogado_em       timestamptz,
  quiz_id         uuid,
  quiz_titulo     text,
  categoria       text,
  subcategoria    text,
  dificuldade     text,
  total_perguntas int,
  acertos         int,
  pontos          int,
  melhor_streak   int,
  aproveitamento  int,
  colocacao       int,
  participantes   int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with minhas as (
    select sj.sala_id as sala
    from public.sala_jogadores sj
    where sj.player_id = auth.uid()
  ),
  -- colocacao e participantes saem de window function: era isso que o
  -- front fazia com uma segunda query por partida
  placar as (
    select
      sj.sala_id as sala, sj.player_id as pid, sj.pontos as pts,
      sj.acertos as ok, sj.melhor_streak as streak, sj.entrou_em as entrou,
      row_number() over (
        partition by sj.sala_id
        order by sj.pontos desc, sj.acertos desc, sj.entrou_em asc, sj.id asc
      )::int as pos,
      count(*) over (partition by sj.sala_id)::int as qtd
    from public.sala_jogadores sj
    where sj.sala_id in (select m.sala from minhas m)
  )
  select
    pl.sala, s.codigo, s.estado, pl.entrou,
    s.quiz_id, q.title, q.category, nullif(btrim(q.subcategoria), ''),
    q.difficulty, s.total_perguntas,
    pl.ok, pl.pts, pl.streak,
    case when s.total_perguntas > 0
         then round(pl.ok * 100.0 / s.total_perguntas)::int
         else 0 end,
    pl.pos, pl.qtd
  from placar pl
  join public.salas s   on s.id = pl.sala
  join public.quizzes q on q.id = s.quiz_id
  where pl.pid = auth.uid()
  order by pl.entrou desc
  limit greatest(1, least(coalesce(p_limite, 100), 500))
$$;

revoke all on function public.meu_historico(int) from public, anon;
grant execute on function public.meu_historico(int) to authenticated;


create or replace function public.meu_desempenho_temas()
returns table (
  categoria      text,
  subcategoria   text,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  pontos         int,
  ultima_em      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with minhas as (
    select
      coalesce(nullif(btrim(pg.categoria), ''), nullif(btrim(q.category), ''), 'Sem tema') as cat,
      coalesce(nullif(btrim(pg.subcategoria), ''), nullif(btrim(q.subcategoria), '')) as sub,
      sr.correta as ok, sr.pontos as pts, sr.respondida_em as em
    from public.sala_respostas sr
    join public.sala_jogadores sj on sj.id = sr.jogador_id
    join public.salas s           on s.id = sr.sala_id
    join public.quizzes q         on q.id = s.quiz_id
    join public.perguntas pg      on pg.id = sr.pergunta_id
    where sj.player_id = auth.uid()
  )
  select
    x.cat, x.sub,
    count(*)::int,
    count(*) filter (where x.ok)::int,
    case when count(*) > 0
         then round(count(*) filter (where x.ok) * 100.0 / count(*))::int
         else 0 end,
    coalesce(sum(x.pts), 0)::int,
    max(x.em)
  from minhas x
  group by x.cat, x.sub
  -- pior aproveitamento primeiro: o que precisa estudar vem no topo
  order by 5 asc, 3 desc
$$;

revoke all on function public.meu_desempenho_temas() from public, anon;
grant execute on function public.meu_desempenho_temas() to authenticated;


-- ---------------------------------------------------------------------
-- Visao do professor
--
-- Todas presas em salas.host_id = auth.uid(). Aluno que chamar essas
-- RPCs recebe zero linhas (ou zeros), nunca dado de outra turma.
-- ---------------------------------------------------------------------

create or replace function public.resumo_professor()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with minhas as (
    select s.id as sala, s.estado as estado
    from public.salas s
    where s.host_id = auth.uid()
  ),
  jogadores as (
    select sj.id as jog, sj.player_id as pid
    from public.sala_jogadores sj
    join minhas m on m.sala = sj.sala_id
  ),
  respostas as (
    select sr.correta as ok
    from public.sala_respostas sr
    join minhas m on m.sala = sr.sala_id
  ),
  por_sala as (
    select m.sala, count(sj.id)::int as qtd
    from minhas m
    left join public.sala_jogadores sj on sj.sala_id = m.sala
    group by m.sala
  )
  select jsonb_build_object(
    'quizzes',             (select count(*)::int from public.quizzes q where q.creator_id = auth.uid()),
    'salas',               (select count(*)::int from minhas),
    'partidas_encerradas', (select count(*)::int from minhas m where m.estado = 'encerrada'),
    'alunos_unicos',       (select count(distinct j.pid)::int from jogadores j),
    'respondidas',         (select count(*)::int from respostas),
    'acertos',             (select count(*)::int from respostas r where r.ok),
    'aproveitamento',      (select case when count(*) > 0
                                        then round(count(*) filter (where r.ok) * 100.0 / count(*))::int
                                        else 0 end
                            from respostas r),
    'media_participantes', (select coalesce(round(avg(ps.qtd))::int, 0) from por_sala ps)
  )
$$;

revoke all on function public.resumo_professor() from public, anon;
grant execute on function public.resumo_professor() to authenticated;


create or replace function public.partidas_do_professor(p_limite int default 50)
returns table (
  sala_id         uuid,
  codigo          text,
  estado          text,
  criada_em       timestamptz,
  quiz_id         uuid,
  quiz_titulo     text,
  categoria       text,
  subcategoria    text,
  dificuldade     text,
  total_perguntas int,
  participantes   int,
  media_pontos    int,
  media_acertos   numeric,
  aproveitamento  int,
  melhor_nome     text,
  melhor_pontos   int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with minhas as (
    select s.id as sala, s.codigo as codigo, s.estado as estado,
           s.created_at as criada, s.quiz_id as quiz, s.total_perguntas as total
    from public.salas s
    where s.host_id = auth.uid()
  ),
  jogadores as (
    select sj.sala_id as sala,
           count(*)::int as qtd,
           avg(sj.pontos)  as media_pts,
           avg(sj.acertos) as media_ok
    from public.sala_jogadores sj
    where sj.sala_id in (select m.sala from minhas m)
    group by sj.sala_id
  ),
  respostas as (
    select sr.sala_id as sala,
           count(*)::int as qtd,
           count(*) filter (where sr.correta)::int as ok
    from public.sala_respostas sr
    where sr.sala_id in (select m.sala from minhas m)
    group by sr.sala_id
  ),
  melhor as (
    select distinct on (sj.sala_id)
           sj.sala_id as sala,
           coalesce(p.name, sj.nome) as nome_top,
           sj.pontos as pts_top
    from public.sala_jogadores sj
    left join public.profiles p on p.id = sj.player_id
    where sj.sala_id in (select m.sala from minhas m)
    order by sj.sala_id, sj.pontos desc, sj.entrou_em asc
  )
  select
    m.sala, m.codigo, m.estado, m.criada, m.quiz, q.title,
    q.category, nullif(btrim(q.subcategoria), ''), q.difficulty, m.total,
    coalesce(j.qtd, 0),
    coalesce(round(j.media_pts), 0)::int,
    coalesce(round(j.media_ok, 1), 0)::numeric,
    case when coalesce(r.qtd, 0) > 0
         then round(r.ok * 100.0 / r.qtd)::int
         else 0 end,
    t.nome_top,
    coalesce(t.pts_top, 0)
  from minhas m
  join public.quizzes q on q.id = m.quiz
  left join jogadores j on j.sala = m.sala
  left join respostas r on r.sala = m.sala
  left join melhor t    on t.sala = m.sala
  order by m.criada desc
  limit greatest(1, least(coalesce(p_limite, 50), 200))
$$;

revoke all on function public.partidas_do_professor(int) from public, anon;
grant execute on function public.partidas_do_professor(int) to authenticated;


-- Detalhe de uma sala. E a unica RPC que devolve alternativas.correta
-- para quem nao jogou, por isso a checagem de dono e a primeira coisa
-- que acontece aqui.
create or replace function public.detalhe_sala_professor(p_sala_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_sala record;
  v_jogadores jsonb;
  v_perguntas jsonb;
begin
  select s.id, s.codigo, s.estado, s.created_at, s.total_perguntas, s.quiz_id,
         q.title, q.category, q.subcategoria, q.difficulty
    into v_sala
    from public.salas s
    join public.quizzes q on q.id = s.quiz_id
   where s.id = p_sala_id
     and s.host_id = auth.uid();

  if not found then
    raise exception 'Essa sala nao e sua.';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'posicao', o.pos,
             'player_id', o.pid,
             'nome', o.nome,
             'pontos', o.pts,
             'acertos', o.ok,
             'respondidas', o.qtd,
             'aproveitamento', case when o.qtd > 0 then round(o.ok * 100.0 / o.qtd)::int else 0 end,
             'melhor_streak', o.streak
           ) order by o.pos
         ), '[]'::jsonb)
    into v_jogadores
    from (
      select
        b.pid, b.nome, b.pts, b.ok, b.qtd, b.streak,
        row_number() over (order by b.pts desc, b.ok desc, b.entrou asc)::int as pos
      from (
        select
          sj.player_id as pid,
          coalesce(p.name, sj.nome) as nome,
          sj.pontos as pts,
          sj.acertos as ok,
          sj.melhor_streak as streak,
          sj.entrou_em as entrou,
          (select count(*)::int from public.sala_respostas sr where sr.jogador_id = sj.id) as qtd
        from public.sala_jogadores sj
        left join public.profiles p on p.id = sj.player_id
        where sj.sala_id = p_sala_id
      ) b
    ) o;

  with itens as (
    select qp.ordem as idx, pg.id as pergunta, pg.enunciado as enunciado,
           coalesce(nullif(btrim(pg.categoria), ''), nullif(btrim(q.category), '')) as cat,
           coalesce(nullif(btrim(pg.subcategoria), ''), nullif(btrim(q.subcategoria), '')) as sub
    from public.quiz_perguntas qp
    join public.perguntas pg on pg.id = qp.pergunta_id
    join public.quizzes q    on q.id = qp.quiz_id
    where qp.quiz_id = v_sala.quiz_id
  ),
  stats as (
    select sr.pergunta_id as pergunta,
           count(*)::int as qtd,
           count(*) filter (where sr.correta)::int as ok,
           coalesce(round(avg(sr.tempo_ms))::int, 0) as tempo
    from public.sala_respostas sr
    where sr.sala_id = p_sala_id
    group by sr.pergunta_id
  ),
  marcacoes as (
    select sr.pergunta_id as pergunta, sr.alternativa_id as alternativa, count(*)::int as qtd
    from public.sala_respostas sr
    where sr.sala_id = p_sala_id and sr.alternativa_id is not null
    group by sr.pergunta_id, sr.alternativa_id
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'index', i.idx,
             'pergunta_id', i.pergunta,
             'enunciado', i.enunciado,
             'categoria', i.cat,
             'subcategoria', i.sub,
             'respondidas', coalesce(st.qtd, 0),
             'acertos', coalesce(st.ok, 0),
             'aproveitamento', case when coalesce(st.qtd, 0) > 0
                                    then round(st.ok * 100.0 / st.qtd)::int else 0 end,
             'tempo_medio_ms', coalesce(st.tempo, 0),
             'alternativas', (
               select coalesce(jsonb_agg(
                        jsonb_build_object(
                          'id', a.id,
                          'texto', a.texto,
                          'correta', a.correta,
                          'ordem', a.ordem,
                          'marcacoes', coalesce(mk.qtd, 0),
                          'percentual', case when coalesce(st.qtd, 0) > 0
                                             then round(coalesce(mk.qtd, 0) * 100.0 / st.qtd)::int else 0 end
                        ) order by a.ordem
                      ), '[]'::jsonb)
               from public.alternativas a
               left join marcacoes mk on mk.pergunta = a.pergunta_id and mk.alternativa = a.id
               where a.pergunta_id = i.pergunta
             )
           ) order by i.idx
         ), '[]'::jsonb)
    into v_perguntas
    from itens i
    left join stats st on st.pergunta = i.pergunta;

  return jsonb_build_object(
    'sala', jsonb_build_object(
      'id', v_sala.id,
      'codigo', v_sala.codigo,
      'estado', v_sala.estado,
      'criada_em', v_sala.created_at,
      'total_perguntas', v_sala.total_perguntas,
      'quiz_titulo', v_sala.title,
      'categoria', v_sala.category,
      'subcategoria', nullif(btrim(coalesce(v_sala.subcategoria, '')), ''),
      'dificuldade', v_sala.difficulty
    ),
    'jogadores', coalesce(v_jogadores, '[]'::jsonb),
    'perguntas', coalesce(v_perguntas, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.detalhe_sala_professor(uuid) from public, anon;
grant execute on function public.detalhe_sala_professor(uuid) to authenticated;


create or replace function public.desempenho_professor_por_tema()
returns table (
  categoria      text,
  subcategoria   text,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  alunos         int,
  partidas       int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with respostas as (
    select
      coalesce(nullif(btrim(pg.categoria), ''), nullif(btrim(q.category), ''), 'Sem tema') as cat,
      coalesce(nullif(btrim(pg.subcategoria), ''), nullif(btrim(q.subcategoria), '')) as sub,
      sr.correta as ok, sr.sala_id as sala, sj.player_id as pid
    from public.sala_respostas sr
    join public.salas s           on s.id = sr.sala_id
    join public.quizzes q         on q.id = s.quiz_id
    join public.perguntas pg      on pg.id = sr.pergunta_id
    join public.sala_jogadores sj on sj.id = sr.jogador_id
    where s.host_id = auth.uid()
  )
  select
    x.cat, x.sub,
    count(*)::int,
    count(*) filter (where x.ok)::int,
    case when count(*) > 0
         then round(count(*) filter (where x.ok) * 100.0 / count(*))::int
         else 0 end,
    count(distinct x.pid)::int,
    count(distinct x.sala)::int
  from respostas x
  group by x.cat, x.sub
  order by 5 asc, 3 desc
$$;

revoke all on function public.desempenho_professor_por_tema() from public, anon;
grant execute on function public.desempenho_professor_por_tema() to authenticated;


create or replace function public.alunos_do_professor(p_limite int default 100)
returns table (
  player_id      uuid,
  nome           text,
  partidas       int,
  pontos         int,
  respondidas    int,
  acertos        int,
  aproveitamento int,
  melhor_streak  int,
  ultima_em      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with minhas as (
    select s.id as sala from public.salas s where s.host_id = auth.uid()
  ),
  jogadores as (
    select sj.id as jog, sj.sala_id as sala, sj.player_id as pid,
           sj.nome as nome_sala, sj.pontos as pts,
           sj.melhor_streak as streak, sj.entrou_em as entrou
    from public.sala_jogadores sj
    where sj.sala_id in (select m.sala from minhas m)
  ),
  respostas as (
    select sr.jogador_id as jog,
           count(*)::int as qtd,
           count(*) filter (where sr.correta)::int as ok,
           max(sr.respondida_em) as ultima
    from public.sala_respostas sr
    where sr.sala_id in (select m.sala from minhas m)
    group by sr.jogador_id
  ),
  totais as (
    select
      j.pid,
      min(coalesce(p.name, j.nome_sala)) as nome_aluno,
      count(distinct j.sala)::int as salas,
      coalesce(sum(j.pts), 0)::int as pts,
      coalesce(sum(r.qtd), 0)::int as qtd,
      coalesce(sum(r.ok), 0)::int as ok,
      coalesce(max(j.streak), 0)::int as streak,
      coalesce(max(r.ultima), max(j.entrou)) as ultima
    from jogadores j
    left join public.profiles p on p.id = j.pid
    left join respostas r       on r.jog = j.jog
    group by j.pid
  )
  select
    t.pid, t.nome_aluno, t.salas, t.pts, t.qtd, t.ok,
    case when t.qtd > 0 then round(t.ok * 100.0 / t.qtd)::int else 0 end,
    t.streak, t.ultima
  from totais t
  order by t.pts desc, t.nome_aluno asc
  limit greatest(1, least(coalesce(p_limite, 100), 500))
$$;

revoke all on function public.alunos_do_professor(int) from public, anon;
grant execute on function public.alunos_do_professor(int) to authenticated;
