# Contrato: Ranking, Resultados e Subcategoria

Documento de acordo entre back-end (Supabase) e front-end (React). O back-end **entrega**
exatamente estas funcoes; o front-end **consome** exatamente estes nomes e campos. Ninguem
inventa campo novo sem atualizar este arquivo.

---

## 1. Schema

Colunas novas:

| Tabela      | Coluna         | Tipo | Observacao                                             |
| ----------- | -------------- | ---- | ------------------------------------------------------ |
| `quizzes`   | `subcategoria` | text | nullable. Ex.: categoria "Matematica" -> "Potenciacao" |
| `perguntas` | `subcategoria` | text | nullable. Herda a do quiz quando nao informada          |

`quizzes.description` volta a ser **descricao livre** (a tela antiga usava esse campo como
subcategoria; o back-end faz o backfill de `description` -> `subcategoria` quando o texto e
curto, sem apagar a descricao).

---

## 2. Camada JS (dona: back-end)

O front-end **nunca** chama `supabase.rpc` direto. Usa estes modulos:

- `src/lib/ranking.js` — catalogo de categorias e ranking
- `src/lib/relatorios.js` — visao do aluno (ja existe, sera reescrito sobre as RPCs)
- `src/lib/professor.js` — visao do professor (novo)

Toda funcao devolve dado ja pronto (camelCase quando for objeto montado no JS; os campos
vindos direto da RPC ficam em snake_case como listado abaixo) e lanca `Error` com mensagem
em portugues quando falha.

---

## 3. Catalogo de categorias

### RPC `catalogo_categorias()`

Pares distintos usados no sistema, para popular `<select>` e `<datalist>`.

```
categoria     text
subcategoria  text | null
quizzes       int
perguntas     int
```

### JS `catalogoCategorias()` — `src/lib/ranking.js`

Devolve `[{ categoria, subcategorias: [{ nome, quizzes, perguntas }] }]`, ordenado por
categoria. Serve tanto para os filtros do ranking quanto para as sugestoes do Criar Quiz.

### Constante `MATERIAS` — `src/lib/ranking.js`

Lista fixa de materias e subcategorias sugeridas (Matematica, Portugues, Historia,
Geografia, Ciencias, Ingles, Fisica, Quimica, Biologia, Artes, Educacao Fisica, Outros).
O front usa isso para pre-preencher o formulario; o professor pode digitar uma subcategoria
que nao esta na lista.

---

## 4. Criar quiz com subcategoria

### RPC `criar_quiz_completo(p_titulo, p_categoria, p_dificuldade, p_tempo, p_perguntas, p_descricao, p_visibilidade, p_subcategoria)`

`p_subcategoria text default null` e o **unico** parametro novo (default mantem chamadas
antigas funcionando). Cada item de `p_perguntas` pode trazer `subcategoria` opcional; sem
ela, a pergunta herda a do quiz.

---

## 5. Ranking

### RPC `ranking_geral(p_categoria, p_subcategoria, p_periodo, p_limite)`

- `p_categoria text default null` — null = todas
- `p_subcategoria text default null` — null = todas
- `p_periodo text default 'sempre'` — `'semana' | 'mes' | 'sempre'`
- `p_limite int default 50`

Retorno (uma linha por jogador, ja ordenado, `posicao` comecando em 1):

```
posicao         int
player_id       uuid
nome            text
avatar_config   jsonb
nivel           int
xp              int
pontos          int        -- pontos no recorte pedido
partidas        int
respondidas     int
acertos         int
aproveitamento  int        -- 0..100
melhor_streak   int
eh_voce         boolean
```

Regra: sem filtro de materia/periodo o ranking soma `sala_jogadores`; com filtro, soma
`sala_respostas` cruzando categoria/subcategoria da pergunta (com fallback para a do quiz).

### RPC `minha_posicao_ranking(p_categoria, p_subcategoria, p_periodo)`

Mesma forma de linha acima, so que do usuario logado, **mesmo que ele esteja fora do top N**.
Zero linhas quando o usuario ainda nao jogou nada no recorte.

### JS — `src/lib/ranking.js`

```js
rankingGeral({ categoria, subcategoria, periodo, limite })  // -> array de linhas acima
minhaPosicao({ categoria, subcategoria, periodo })          // -> linha ou null
catalogoCategorias()                                         // -> ver secao 3
```

---

## 6. Visao do aluno

### RPC `meu_historico(p_limite int default 100)`

Uma linha por partida do aluno logado, da mais recente para a mais antiga:

```
sala_id          uuid
codigo           text
estado           text        -- 'lobby' | 'pergunta' | 'revelacao' | 'encerrada'
jogado_em        timestamptz
quiz_id          uuid
quiz_titulo      text
categoria        text
subcategoria     text | null
dificuldade      text
total_perguntas  int
acertos          int
pontos           int
melhor_streak    int
aproveitamento   int         -- 0..100
colocacao        int
participantes    int
```

### RPC `meu_desempenho_temas()`

```
categoria       text
subcategoria    text | null
respondidas     int
acertos         int
aproveitamento  int
pontos          int
ultima_em       timestamptz
```

### JS — `src/lib/relatorios.js` (nomes existentes preservados)

```js
meuHistorico(perfilId)          // -> linhas de meu_historico (camelCase nao; snake_case da RPC)
resumoDoHistorico(historico)    // -> { partidas, pontos, melhorStreak, aproveitamento, acertos, perguntas, vitorias, podios }
meuDetalhePartida(salaId, perfilId)
meuDesempenhoPorTema(perfilId)  // -> linhas de meu_desempenho_temas + campo `tema` (categoria · subcategoria) para compatibilidade
formatarData(valor)
formatarTempo(ms)
```

`resumoDoHistorico` ganha `acertos`, `perguntas`, `vitorias` (colocacao 1) e `podios`
(colocacao <= 3) alem do que ja devolvia.

---

## 7. Visao do professor

Todas as RPCs abaixo sao `security definer` e so devolvem dados de salas onde
`salas.host_id = auth.uid()`.

### RPC `resumo_professor()` -> jsonb

```json
{
  "quizzes": 0,
  "salas": 0,
  "partidas_encerradas": 0,
  "alunos_unicos": 0,
  "respondidas": 0,
  "acertos": 0,
  "aproveitamento": 0,
  "media_participantes": 0
}
```

### RPC `partidas_do_professor(p_limite int default 50)`

```
sala_id          uuid
codigo           text
estado           text
criada_em        timestamptz
quiz_id          uuid
quiz_titulo      text
categoria        text
subcategoria     text | null
dificuldade      text
total_perguntas  int
participantes    int
media_pontos     int
media_acertos    numeric
aproveitamento   int
melhor_nome      text | null
melhor_pontos    int
```

### RPC `detalhe_sala_professor(p_sala_id uuid)` -> jsonb

```json
{
  "sala": {
    "id": "uuid", "codigo": "ABC123", "estado": "encerrada",
    "criada_em": "...", "total_perguntas": 10,
    "quiz_titulo": "...", "categoria": "...", "subcategoria": "...", "dificuldade": "..."
  },
  "jogadores": [
    { "posicao": 1, "player_id": "uuid", "nome": "...", "pontos": 0,
      "acertos": 0, "respondidas": 0, "aproveitamento": 0, "melhor_streak": 0 }
  ],
  "perguntas": [
    { "index": 0, "pergunta_id": "uuid", "enunciado": "...",
      "categoria": "...", "subcategoria": "...",
      "respondidas": 0, "acertos": 0, "aproveitamento": 0, "tempo_medio_ms": 0,
      "alternativas": [
        { "id": "uuid", "texto": "...", "correta": true, "ordem": 0,
          "marcacoes": 0, "percentual": 0 }
      ]
    }
  ]
}
```

Erro `'Essa sala nao e sua.'` quando o professor nao e o host.

### RPC `desempenho_professor_por_tema()`

```
categoria       text
subcategoria    text | null
respondidas     int
acertos         int
aproveitamento  int
alunos          int
partidas        int
```

### RPC `alunos_do_professor(p_limite int default 100)`

```
player_id       uuid
nome            text
partidas        int
pontos          int
respondidas     int
acertos         int
aproveitamento  int
melhor_streak   int
ultima_em       timestamptz
```

### JS — `src/lib/professor.js`

```js
resumoProfessor()
partidasDoProfessor(limite)
detalheSalaProfessor(salaId)
desempenhoProfessorPorTema()
alunosDoProfessor(limite)
```

---

## 8. Telas (dona: front-end)

| Rota                                | Quem      | O que muda                                                                                     |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `/dashboard/ranking`                | todos     | podio top 3, filtros de periodo/materia/subcategoria, tabela rica, faixa "sua posicao"           |
| `/dashboard/resultados`             | aluno     | KPIs, evolucao, desempenho por materia/subcategoria, historico filtravel                         |
| `/dashboard/resultados`             | professor | painel da turma: KPIs, partidas, temas, alunos                                                   |
| `/dashboard/resultados/:salaId`     | aluno     | detalhe pergunta a pergunta (ja existe, so polimento)                                            |
| `/dashboard/resultados/turma/:salaId` | professor | **novo**: placar da sala + acerto por pergunta + distribuicao das alternativas                 |
| `/dashboard/criar-quiz`             | professor | campo Subcategoria com sugestoes por materia + descricao separada                                |
| `/dashboard/temas`                  | aluno     | agrupado por materia, com as subcategorias dentro                                                |
| `/dashboard/jogos`, `/dashboard/pesquisa` | -   | badge da subcategoria no card                                                                    |

Cuidado com a ordem das rotas: `resultados/turma/:salaId` precisa vir **antes** de
`resultados/:salaId` no router.

---

## 9. Detalhes da implementacao (back-end)

Nenhum nome de RPC, parametro ou campo mudou em relacao as secoes acima. O que segue
sao decisoes de implementacao que o front precisa conhecer:

1. **Comparacao de materia ignora acento, caixa e espaco nas pontas.** `"ciencias"`,
   `" Ciências "` e `"CIÊNCIAS"` filtram a mesma coisa. `p_periodo` tambem aceita
   `"mês"` alem de `"mes"`.
2. **`catalogo_categorias()` so conta quiz que o usuario logado pode ver**: publico, dele
   mesmo ou que ele ja jogou. E `security definer`, entao nao pode servir de porta para o
   aluno descobrir os temas dos quizzes privados de um professor. Consequencia pratica: o
   catalogo do aluno e menor que o do professor.
3. **Limites tem teto**: `ranking_geral`/`partidas_do_professor` no maximo 200 linhas,
   `meu_historico`/`alunos_do_professor` no maximo 500. `p_limite` null ou 0 cai no default.
4. **`meuHistorico(perfilId)` e `meuDesempenhoPorTema(perfilId)` continuam recebendo o
   perfil**, mas ele nao vai para o banco: as RPCs usam `auth.uid()`. O parametro so evita a
   chamada enquanto o perfil ainda esta carregando.
5. **`resumoDoHistorico(...).aproveitamento` devolve `0`** (nao `null`) quando ainda nao ha
   perguntas respondidas, igual as RPCs.
6. **Resposta sem categoria em lugar nenhum** (nem na pergunta, nem no quiz) aparece nos
   desempenhos por tema como categoria `"Sem tema"`.
7. **Backfill de `description` -> `subcategoria`**: so copiou textos de ate 60 caracteres
   **e** no maximo 5 palavras. Uma frase como "Este e um quiz para testar..." continua
   sendo so descricao; caso contrario ela viraria um item do `<select>` de subcategoria.
8. **Empate no ranking**: pontos, depois aproveitamento, depois nome, depois `player_id`.
   O ultimo criterio existe so para a `posicao` nao dancar entre duas chamadas iguais.
