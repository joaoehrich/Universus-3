-- =====================================================================
-- Subcategoria em quizzes e perguntas - Universus
--
-- A categoria sozinha ("Matematica") e grossa demais para o ranking e
-- para os relatorios: o que o aluno erra e "Potenciacao", nao
-- "Matematica" inteira. Entra uma segunda coluna em quizzes e em
-- perguntas; a pergunta herda a do quiz quando nao informa a propria.
--
-- Ate agora a tela de Criar Quiz mandava a subcategoria dentro de
-- p_descricao, entao quizzes.description guarda subcategoria em alguns
-- registros. O backfill copia (nao move) esses textos curtos.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Colunas
-- ---------------------------------------------------------------------

alter table public.quizzes   add column if not exists subcategoria text;
alter table public.perguntas add column if not exists subcategoria text;


-- Indices das agregacoes de ranking/relatorio, que filtram e agrupam
-- sempre pelo par categoria + subcategoria.
create index if not exists quizzes_categoria_idx      on public.quizzes (category, subcategoria);
create index if not exists perguntas_subcategoria_idx on public.perguntas (categoria, subcategoria);

-- FKs sem indice que as agregacoes percorrem o tempo todo.
create index if not exists quizzes_creator_idx         on public.quizzes (creator_id);
create index if not exists quiz_perguntas_pergunta_idx on public.quiz_perguntas (pergunta_id);
create index if not exists salas_host_idx              on public.salas (host_id);
create index if not exists salas_quiz_idx              on public.salas (quiz_id);
create index if not exists sala_jogadores_player_idx   on public.sala_jogadores (player_id);
create index if not exists sala_respostas_jogador_idx  on public.sala_respostas (jogador_id);
create index if not exists sala_respostas_pergunta_idx on public.sala_respostas (pergunta_id);
create index if not exists sala_respostas_data_idx     on public.sala_respostas (respondida_em);


-- ---------------------------------------------------------------------
-- Backfill: description curta e de poucas palavras era, na pratica, a
-- subcategoria digitada na tela antiga. A description continua onde
-- esta - so copiamos, nunca apagamos, porque texto de aluno/professor
-- nao se joga fora sem pedir.
-- ---------------------------------------------------------------------

update public.quizzes
   set subcategoria = btrim(description)
 where subcategoria is null
   and coalesce(btrim(description), '') <> ''
   and length(btrim(description)) <= 60
   -- ate 5 palavras: "Segunda Guerra Mundial" e rotulo, uma frase com
   -- ponto final e descricao de verdade e nao pode virar filtro.
   and coalesce(array_length(regexp_split_to_array(btrim(description), '\s+'), 1), 1) <= 5;


-- Pergunta sem subcategoria herda a do quiz em que ela esta.
update public.perguntas p
   set subcategoria = q.subcategoria
  from public.quiz_perguntas qp
  join public.quizzes q on q.id = qp.quiz_id
 where qp.pergunta_id = p.id
   and p.subcategoria is null
   and coalesce(btrim(q.subcategoria), '') <> '';


-- ---------------------------------------------------------------------
-- criar_quiz_completo ganha p_subcategoria no fim da assinatura.
--
-- O drop da assinatura antiga e obrigatorio: com as duas versoes vivas
-- o PostgREST nao consegue escolher qual chamar e devolve 300.
-- ---------------------------------------------------------------------

drop function if exists public.criar_quiz_completo(text, text, text, integer, jsonb, text, text);

create or replace function public.criar_quiz_completo(
  p_titulo       text,
  p_categoria    text,
  p_dificuldade  text,
  p_tempo        integer,
  p_perguntas    jsonb,
  p_descricao    text default ''::text,
  p_visibilidade text default 'privado'::text,
  p_subcategoria text default null
)
returns table (id uuid, access_code text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_dif text;
  v_sub text;
  v_sub_item text;
  v_quiz uuid;
  v_codigo text;
  v_pergunta uuid;
  v_item jsonb;
  v_alt jsonb;
  v_ordem integer := 0;
  v_ordem_alt integer;
  v_correta integer;
begin
  if v_uid is null then
    raise exception 'Voce precisa estar logado para salvar o quiz.';
  end if;

  if coalesce(trim(p_titulo), '') = '' then
    raise exception 'Informe o titulo do quiz.';
  end if;

  if coalesce(trim(p_categoria), '') = '' then
    raise exception 'Selecione a categoria do quiz.';
  end if;

  if jsonb_array_length(coalesce(p_perguntas, '[]'::jsonb)) = 0 then
    raise exception 'Adicione pelo menos uma pergunta.';
  end if;

  -- aceita "Facil" ou "Fácil": remove os acentos antes de bater com o CHECK do banco
  v_dif := initcap(translate(lower(coalesce(p_dificuldade, 'facil')), 'áàâãéêíìóòôõúùüç', 'aaaaeeiioooouuuc'));

  if v_dif not in ('Facil', 'Medio', 'Dificil') then
    raise exception 'Dificuldade invalida: %', p_dificuldade;
  end if;

  -- subcategoria em branco vira null: assim o filtro do ranking nao
  -- cria um grupo "" separado do grupo "sem subcategoria".
  v_sub := nullif(btrim(coalesce(p_subcategoria, '')), '');

  loop
    v_codigo := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from quizzes q where q.access_code = v_codigo);
  end loop;

  insert into quizzes (
    creator_id, title, description, category, subcategoria, difficulty,
    time_per_question, access_code, visibilidade, qtd_perguntas
  )
  values (
    v_uid, trim(p_titulo), coalesce(p_descricao, ''), trim(p_categoria), v_sub, v_dif,
    coalesce(p_tempo, 30), v_codigo, coalesce(p_visibilidade, 'privado'),
    jsonb_array_length(p_perguntas)
  )
  returning quizzes.id into v_quiz;

  for v_item in select * from jsonb_array_elements(p_perguntas)
  loop
    v_ordem := v_ordem + 1;

    if coalesce(trim(v_item->>'pergunta'), '') = '' then
      raise exception 'A pergunta % esta sem enunciado.', v_ordem;
    end if;

    -- sem subcategoria propria, a pergunta herda a do quiz
    v_sub_item := coalesce(nullif(btrim(coalesce(v_item->>'subcategoria', '')), ''), v_sub);

    insert into perguntas (professor_id, enunciado, categoria, subcategoria, dificuldade)
    values (v_uid, trim(v_item->>'pergunta'), trim(p_categoria), v_sub_item, v_dif)
    returning perguntas.id into v_pergunta;

    v_correta := coalesce((v_item->>'correta')::integer, 0);
    v_ordem_alt := 0;

    for v_alt in select * from jsonb_array_elements(coalesce(v_item->'alternativas', '[]'::jsonb))
    loop
      if coalesce(trim(v_alt #>> '{}'), '') = '' then
        raise exception 'A pergunta % tem alternativa em branco.', v_ordem;
      end if;

      insert into alternativas (pergunta_id, texto, correta, ordem)
      values (v_pergunta, trim(v_alt #>> '{}'), v_ordem_alt = v_correta, v_ordem_alt);

      v_ordem_alt := v_ordem_alt + 1;
    end loop;

    if v_ordem_alt < 2 then
      raise exception 'A pergunta % precisa de pelo menos 2 alternativas.', v_ordem;
    end if;

    if v_correta < 0 or v_correta >= v_ordem_alt then
      raise exception 'Marque a alternativa correta da pergunta %.', v_ordem;
    end if;

    insert into quiz_perguntas (quiz_id, pergunta_id, ordem, tempo_limite)
    values (v_quiz, v_pergunta, v_ordem - 1, coalesce(p_tempo, 30));
  end loop;

  return query select v_quiz, v_codigo;
end;
$$;

revoke all on function public.criar_quiz_completo(text, text, text, integer, jsonb, text, text, text) from public, anon;
grant execute on function public.criar_quiz_completo(text, text, text, integer, jsonb, text, text, text) to authenticated;
