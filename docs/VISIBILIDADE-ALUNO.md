# Visibilidade do Aluno — Universus

Especificação do que o aluno vê, do que ele **não** pode ver nem fazer, e de como
isso deve ser implementado no front (React) e no banco (Supabase/Postgres).

- **Papéis existentes:** `profiles.role ∈ ('professor', 'aluno')`
- **Origem do papel:** trigger `public.novo_usuario()` lê `raw_user_meta_data->>'tipo'`
  no cadastro; qualquer valor fora da lista vira `aluno`.
- **Status:** especificação. Nada abaixo está implementado ainda — a auditoria da
  seção 2 descreve o estado atual do código.

---

## 1. Princípio

> O aluno é **consumidor** de conteúdo e **dono** dos próprios dados.
> Ele nunca cria conteúdo pedagógico, nunca conduz partida e nunca enxerga
> dado de outro aluno além do que é público por natureza (placar e ranking).

Três regras derivam disso:

1. **Autoria é do professor.** Criar quiz, criar pergunta, abrir sala, conduzir
   partida — nada disso aparece para o aluno.
2. **Histórico é privado.** Relatórios, respostas, acertos e erros do aluno só são
   visíveis para ele e para o professor dono do quiz.
3. **Gabarito só depois da revelação.** O aluno nunca consegue ler
   `alternativas.correta` antes de o professor revelar a resposta — nem pela tela,
   nem pela API.

---

## 2. Auditoria do estado atual

O que segue foi verificado no código e nas políticas RLS do projeto
`otxvqphwtuldkrglfwxh`. **Hoje não existe nenhuma verificação de papel** — nem no
front, nem no banco.

### 2.1 Front-end: tudo aberto para todos

| Onde | Problema |
|---|---|
| `src/components/Sidebar.jsx:25-28` | Link **Criar Quiz** visível para o aluno |
| `src/components/Sidebar.jsx:45-48` | Link **Salas** (painel do professor) visível para o aluno |
| `src/components/Sidebar.jsx:20-23` | Link **Meus Jogos** (quizzes criados) visível para o aluno |
| `src/pages/HomePage.jsx:74-98` | Card gigante **Criar Quiz** na home do aluno |
| `src/pages/HomePage.jsx:158-172` | Métrica "Quizzes Criados" — sempre 0 para aluno, ocupa espaço útil |
| `src/pages/PesquisaPage.jsx:147-154` | Botão **"🚀 Abrir sala"** em cada card: o aluno vira anfitrião de qualquer quiz público |
| `src/routes.jsx:62-80` | Rotas `criar-quiz`, `jogos`, `salas`, `sala/:codigo` sem nenhum guard |
| `src/pages/ResultadosPage.jsx:1-9` | Stub vazio — é exatamente a tela que o aluno mais precisa |
| `src/pages/ConfiguracoesPage.jsx:1-9` | Stub vazio |

O hook `usePerfil()` (`src/hooks/usePerfil.js:6`) **já carrega `role`** — o dado
existe, só não é usado por ninguém.

### 2.2 Banco: cinco brechas reais

Estas são falhas de verdade, não hipóteses. Corrigir a interface sem corrigir o
banco não resolve — a API REST do Supabase fica exposta com a mesma chave anon.

**B1 — Aluno pode criar quiz e pergunta.**
`quizzes_insert` exige apenas `auth.uid() = creator_id`; `perguntas_insert`, apenas
`professor_id = auth.uid()`. Nenhuma das duas olha `role`.

**B2 — Aluno pode abrir sala e conduzir a partida.**
`criar_sala()` (migração `20260805120000_partida_ao_vivo.sql:141-154`) só checa se
há sessão e se o quiz é dele ou público. Um aluno logado abre sala de qualquer quiz
público e vira host, com acesso a `iniciar_partida`, `revelar_resposta` e
`proxima_pergunta`.

**B3 — Gabarito vazando pela API (crítico).**
`alternativas_select` tem qual `EXISTS (SELECT 1 FROM perguntas p WHERE p.id = pergunta_id)`
— ou seja, **qualquer alternativa cuja pergunta exista**. Combinado com
`perguntas_select` (que libera `private.pergunta_em_quiz(id)`), o aluno lê
`alternativas.correta` de qualquer pergunta que esteja em qualquer quiz:

```
GET /rest/v1/alternativas?select=pergunta_id,texto,correta
```

A RPC `pergunta_da_sala()` esconde `correta` com todo o cuidado (linha 294 da
migração) e a leitura direta da tabela entrega o gabarito de graça.

**B4 — Aluno lê as respostas dos colegas.**
`sala_respostas_select` é `using (true)`. Qualquer autenticado lê o que cada jogador
marcou, quando marcou e se acertou.

**B5 — Aluno pode se auto-promover e forjar XP.**
A policy `"Usuarios podem atualizar proprio perfil"` tem `USING (auth.uid() = id)` e
**`WITH CHECK` nulo**, sem restrição de coluna. Isso permite:

```sql
update profiles set role = 'professor', xp = 999999 where id = auth.uid();
```

Bônus: `profiles_select_autenticados` é `using (true)`, então o e-mail de todos os
usuários está legível — a tela de Ranking só precisa de `name`, `xp`, `nivel`.

---

## 3. Matriz de permissões

### 3.1 O aluno **não** pode

| Ação | Bloqueio no front | Bloqueio no banco |
|---|---|---|
| Criar / editar / excluir quiz | Rota e links escondidos | `role = 'professor'` no `WITH CHECK` de `quizzes` |
| Criar / editar / excluir pergunta | Sem tela | `role = 'professor'` no `WITH CHECK` de `perguntas` e `alternativas` |
| Abrir sala (virar host) | Botão "Abrir sala" removido | Guarda de papel dentro de `criar_sala()` |
| Iniciar / revelar / avançar partida | Rota `sala/:codigo` bloqueada | `host_id = auth.uid()` (já existe) |
| Ver `alternativas.correta` antes da revelação | — | **B3**: restringir `alternativas_select` |
| Ver resposta de outro aluno | — | **B4**: restringir `sala_respostas_select` |
| Mudar o próprio `role`, `xp` ou `nivel` | Campos não editáveis | **B5**: `WITH CHECK` travando as colunas |
| Ver e-mail de outros usuários | — | View pública só com `name`, `xp`, `nivel`, `avatar_config` |
| Ver quiz privado do qual não participou | — | `visibilidade = 'publico'` ou participação registrada |

### 3.2 O aluno **pode**

| Ação | Tela | Fonte de dados |
|---|---|---|
| Entrar em sala pelo código | `EntrarSalaPage` | RPC `entrar_sala(codigo)` |
| Jogar a partida ao vivo | `JogarPage` | RPCs `pergunta_da_sala`, `responder_pergunta` |
| Ver histórico das próprias partidas | **Meus Resultados** (nova) | `quiz_attempts` + `salas` |
| Rever pergunta a pergunta o que respondeu | **Detalhe da Partida** (nova) | `sala_respostas` (só as dele) |
| Ver desempenho por tema | **Meus Temas** (nova) | `perguntas.categoria` agregada |
| Explorar quizzes públicos | `PesquisaPage` (sem "Abrir sala") | `quizzes` com `visibilidade = 'publico'` |
| Ver ranking geral | `RankingPage` | view `ranking_publico` |
| Ver placar da sala em que está | `JogarPage` | `sala_jogadores` da sala dele |
| Editar nome e avatar | `PerfilPage`, `PersonagemPage` | `profiles` (colunas permitidas) |
| Ver XP, nível e conquistas | `PerfilPage` | `profiles`, `usuario_conquistas` |
| Ver turmas de que participa | **Minhas Turmas** (nova, fase 3) | `turma_alunos` + `turmas` |

---

## 4. Navegação por papel

### 4.1 Sidebar

| Item | Professor | Aluno |
|---|:---:|:---:|
| Início | ✅ | ✅ |
| Meus Jogos | ✅ | ❌ |
| Criar Quiz | ✅ | ❌ |
| Salas | ✅ | ❌ |
| Pesquisa | ✅ | ✅ |
| Entrar em Sala | ✅ | ✅ |
| **Meus Resultados** | ❌ (ele tem "Relatórios da Turma") | ✅ |
| **Meus Temas** | ❌ | ✅ |
| Ranking | ✅ | ✅ |
| Meu Personagem | ✅ | ✅ |
| Configurações | ✅ | ✅ |

O item genérico **Resultados** (`/dashboard/resultados`, hoje stub) passa a ser
**Meus Resultados** para o aluno.

### 4.2 Rotas protegidas

Rotas exclusivas de professor: `jogos`, `criar-quiz`, `salas`, `sala/:codigo`.
Aluno que digitar a URL na mão é redirecionado para `/dashboard` com aviso — não
pode ver uma tela quebrada nem um erro de RLS cru.

```jsx
// src/components/RotaProtegida.jsx
import { Navigate } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";

// Bloqueia a rota para quem não tem o papel exigido. Enquanto o perfil
// carrega não decide nada, senão o professor pisca fora da própria tela.
function RotaProtegida({ papel, children }) {
  const { perfil, carregando } = usePerfil();

  if (carregando) return <p className="text-light">Carregando...</p>;
  if (perfil?.role !== papel) return <Navigate to="/dashboard" replace />;

  return children;
}

export default RotaProtegida;
```

Uso em `src/routes.jsx`:

```jsx
{
  path: "criar-quiz",
  element: (
    <RotaProtegida papel="professor">
      <CriarQuizPage />
    </RotaProtegida>
  ),
}
```

Um helper `useEhAluno()` sobre o `usePerfil()` existente evita repetir
`perfil?.role === "aluno"` em cada componente.

---

## 5. Telas do aluno

### 5.1 Início (`HomePage`)

Cards de ação, na versão aluno:

| Card | Destino |
|---|---|
| 🎮 Entrar em Sala | `/dashboard/entrar-sala` |
| 📊 Meus Resultados | `/dashboard/resultados` |
| 🚀 Meu Personagem | `/dashboard/personagem` |

Métricas (substituindo "Quizzes Criados", que é sempre 0 para o aluno):

| Métrica | Cálculo |
|---|---|
| Partidas jogadas | `count(quiz_attempts where student_id = eu)` |
| Aproveitamento | `sum(correct_answers) / sum(total_questions)` |
| Pontos totais | `sum(quiz_attempts.score)` |
| Nível | `profiles.nivel` + barra de XP |

Abaixo, **Últimas partidas**: as 3 mais recentes, cada uma linkando para o detalhe.

### 5.2 Meus Resultados (`/dashboard/resultados`)

Substitui o stub `ResultadosPage.jsx`. É a tela central da visibilidade do aluno.

**Faixa de resumo**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Partidas    │ Aproveitam.  │ Melhor seq.  │ Pontos totais│
│     12       │     73%      │    🔥 8      │    9.240     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Tabela de partidas** — ordenada por data, mais recente primeiro:

| Data | Quiz | Tema | Acertos | Pontos | Colocação | |
|---|---|---|---|---|---|---|
| 05/08 14:32 | Revolução Francesa | História | 8/10 | 1.420 | 2º de 27 | [Ver respostas] |

Filtros: por tema (`quizzes.category`) e por período. Estado vazio: *"Você ainda não
jogou nenhuma partida. Peça um código ao seu professor."* com botão para
`/dashboard/entrar-sala`.

### 5.3 Detalhe da Partida (`/dashboard/resultados/:salaId`)

Onde o aluno revê **suas respostas**, pergunta por pergunta. Só aparece quando a
sala está `encerrada` — antes disso seria gabarito antecipado.

Para cada pergunta:

- Número e enunciado
- Alternativa marcada pelo aluno, com ✅ ou ❌
- Alternativa correta
- Tempo de resposta (`tempo_ms`) e pontos ganhos
- Explicação (`perguntas.explicacao`), quando houver
- Multiplicador de combo aplicado

Rodapé: total de acertos, pontos, melhor sequência e XP ganho na partida
(`round(pontos / 10)`).

> **Nota de modelagem:** `encerrar_partida()` grava um `quiz_attempts` por jogador
> (linhas 603-610 da migração), mas **não** popula `respostas_aluno`. O detalhe por
> pergunta portanto vive em `sala_respostas`, ligado ao aluno via
> `sala_jogadores.player_id`. A tabela `respostas_aluno` fica reservada para o modo
> assíncrono (solo), ainda não implementado.

### 5.4 Meus Temas (`/dashboard/temas`)

Não existe tabela `temas` no schema. **Tema = categoria**, disponível em dois níveis:

- `quizzes.category` — tema do quiz inteiro
- `perguntas.categoria` — tema da pergunta individual (mais preciso)

O agrupamento usa `perguntas.categoria` com fallback para `quizzes.category`.

| Tema | Respondidas | Acertos | Aproveitamento | |
|---|---|---|---|---|
| História | 42 | 35 | ▓▓▓▓▓▓▓▓░░ 83% | Forte 💪 |
| Matemática | 30 | 12 | ▓▓▓▓░░░░░░ 40% | A treinar 📚 |

Ordenado do menor aproveitamento para o maior — o que o aluno precisa estudar
aparece primeiro. Cada tema abre a lista de perguntas erradas naquele tema, com
enunciado, resposta correta e explicação.

### 5.5 Pesquisa (`PesquisaPage`)

Para o aluno, o botão **"🚀 Abrir sala"** (`PesquisaPage.jsx:147-154`) some. No lugar,
um botão **"Ver detalhes"**, mostrando título, descrição, tema, dificuldade,
nº de perguntas e autor — **nunca** as perguntas em si, que são o conteúdo da partida.

### 5.6 Ranking (`RankingPage`)

Funciona hoje, mas lê `profiles` direto. Passa a ler a view `ranking_publico`
(seção 6.3), que expõe só `name`, `xp` e `nivel`. A linha do próprio aluno segue
destacada (`RankingPage.jsx:86-92`).

### 5.7 Perfil (`PerfilPage`)

Já mostra XP, nível e papel. Acrescentar:

- Barra de progresso até o próximo nível (`progressoDoNivel()` de `src/lib/partida.js:26`)
- Conquistas obtidas (`usuario_conquistas` + `conquistas`)
- Data de entrada (`created_at`)

O campo **Papel** fica somente-leitura (já está, na prática) e o e-mail permanece
`disabled` (`PerfilPage.jsx:107-114`).

### 5.8 Configurações (`ConfiguracoesPage`)

Substitui o stub. Para o aluno: trocar senha, preferências de som/animação da
partida, e nada de administração.

---

## 6. Mudanças no banco

Ordem importa: **6.1 e 6.2 são pré-requisito de tudo**, porque sem elas a interface
esconde botões que a API continua aceitando.

### 6.1 Helper de papel

```sql
create or replace function private.eh_professor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'professor'
  );
$$;
```

### 6.2 Corrigir as cinco brechas

```sql
-- B1: só professor cria conteúdo pedagógico.
drop policy if exists "Professores podem criar quizzes" on public.quizzes;
create policy quizzes_insert on public.quizzes
  for insert to authenticated
  with check (creator_id = auth.uid() and private.eh_professor());

drop policy if exists perguntas_insert on public.perguntas;
create policy perguntas_insert on public.perguntas
  for insert to authenticated
  with check (professor_id = auth.uid() and private.eh_professor());

-- B3: gabarito só para o dono da pergunta ou quando a sala revelou.
drop policy if exists alternativas_select on public.alternativas;
create policy alternativas_select on public.alternativas
  for select to authenticated
  using (
    private.is_pergunta_owner(pergunta_id)
    or private.alternativa_revelada(id)
  );

-- B4: o aluno vê só as respostas dele; o host vê as da sala dele.
drop policy if exists sala_respostas_select on public.sala_respostas;
create policy sala_respostas_select on public.sala_respostas
  for select to authenticated
  using (
    exists (
      select 1 from public.sala_jogadores j
       where j.id = sala_respostas.jogador_id and j.player_id = auth.uid()
    )
    or exists (
      select 1 from public.salas s
       where s.id = sala_respostas.sala_id and s.host_id = auth.uid()
    )
  );

-- B5: ninguém edita o próprio papel, XP ou nível pela API.
drop policy if exists "Usuarios podem atualizar proprio perfil" on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role  = (select p.role  from public.profiles p where p.id = auth.uid())
    and xp    = (select p.xp    from public.profiles p where p.id = auth.uid())
    and nivel = (select p.nivel from public.profiles p where p.id = auth.uid())
  );
```

`private.alternativa_revelada(id)` devolve `true` quando a alternativa pertence a
uma pergunta cuja sala está em `revelacao` ou `encerrada` **e** o usuário é jogador
dessa sala. Como `encerrar_partida()` e `responder_pergunta()` são `SECURITY
DEFINER`, apertar essa policy **não quebra a partida ao vivo** — a pontuação
continua sendo calculada no banco, ignorando RLS.

**B2** vive dentro de `criar_sala()`, logo após a checagem de sessão
(migração, linha 141):

```sql
  if not private.eh_professor() then
    raise exception 'Apenas professores podem abrir salas.';
  end if;
```

### 6.3 View pública de ranking

```sql
create or replace view public.ranking_publico
with (security_invoker = true) as
  select id, name, xp, nivel, avatar_config
    from public.profiles;

drop policy if exists profiles_select_autenticados on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.eh_professor());
```

### 6.4 RPCs de relatório do aluno

Três funções `SECURITY DEFINER`, cada uma filtrando por `auth.uid()` internamente.
Elas evitam três a quatro queries encadeadas no front e garantem o filtro no banco.

| Função | Devolve | Alimenta |
|---|---|---|
| `meu_historico()` | uma linha por partida: `sala_id`, quiz, tema, data, pontos, acertos, total, colocação | Meus Resultados (5.2) |
| `meu_detalhe_partida(p_sala_id uuid)` | uma linha por pergunta: enunciado, alternativa marcada, alternativa correta, `correta`, `tempo_ms`, `pontos`, explicação | Detalhe da Partida (5.3) |
| `meu_desempenho_por_tema()` | `tema`, `respondidas`, `acertos`, `aproveitamento` | Meus Temas (5.4) |

Esboço da terceira, para fixar a forma:

```sql
create or replace function public.meu_desempenho_por_tema()
returns table (tema text, respondidas bigint, acertos bigint, aproveitamento numeric)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(nullif(trim(p.categoria), ''), q.category, 'Sem tema') as tema,
         count(*)                                                        as respondidas,
         count(*) filter (where r.correta)                               as acertos,
         round(100.0 * count(*) filter (where r.correta) / count(*), 1)  as aproveitamento
    from public.sala_respostas  r
    join public.sala_jogadores  j on j.id = r.jogador_id
    join public.perguntas       p on p.id = r.pergunta_id
    join public.salas           s on s.id = r.sala_id
    join public.quizzes         q on q.id = s.quiz_id
   where j.player_id = auth.uid()
   group by 1
   order by aproveitamento asc;
$$;
```

`meu_detalhe_partida` só devolve linhas se a sala estiver `encerrada` — caso
contrário levantaria o gabarito no meio da partida.

Tudo isso entra em uma migração nova, `supabase/migrations/<timestamp>_visibilidade_aluno.sql`.
Nenhum arquivo de migração existente deve ser editado.

---

## 7. Arquivos afetados

**Novos**

| Arquivo | Papel |
|---|---|
| `src/components/RotaProtegida.jsx` | Guard de rota por papel |
| `src/hooks/useEhAluno.js` | Açúcar sobre `usePerfil()` |
| `src/lib/relatorios.js` | Chamadas das RPCs da seção 6.4, no mesmo estilo de `src/lib/partida.js` |
| `src/pages/DetalhePartidaPage.jsx` | Tela 5.3 |
| `src/pages/TemasPage.jsx` | Tela 5.4 |
| `supabase/migrations/<ts>_visibilidade_aluno.sql` | Seção 6 inteira |

**Modificados**

| Arquivo | Mudança |
|---|---|
| `src/components/Sidebar.jsx` | Menu por papel (tabela 4.1) |
| `src/routes.jsx` | Envolver rotas de professor em `RotaProtegida`; novas rotas de aluno |
| `src/pages/HomePage.jsx` | Cards e métricas por papel (5.1) |
| `src/pages/ResultadosPage.jsx` | Implementar a tela 5.2 (hoje é stub) |
| `src/pages/PesquisaPage.jsx` | Trocar "Abrir sala" por "Ver detalhes" quando aluno |
| `src/pages/RankingPage.jsx` | Ler `ranking_publico` no lugar de `profiles` |
| `src/pages/PerfilPage.jsx` | Barra de XP e conquistas |
| `src/pages/ConfiguracoesPage.jsx` | Implementar a tela 5.8 (hoje é stub) |

**Reaproveitar, não reescrever:** `Placar`, `CartaoAlternativa`, `XPBar`, `Card`,
`usePerfil()`, e as funções `xpDaPartida` / `nivelDoXp` / `progressoDoNivel` /
`multiplicadorDoCombo` de `src/lib/partida.js`.

---

## 8. Fases

| Fase | Escopo | Por quê primeiro |
|---|---|---|
| **1 — Trancar** | Seção 6.2 (B1–B5) + `RotaProtegida` + Sidebar por papel | Sem isso, esconder botão é teatro: a API continua aberta |
| **2 — Enxergar** | RPCs 6.4 + Meus Resultados + Detalhe da Partida | É o pedido central: relatórios e respostas |
| **3 — Entender** | Meus Temas + Home do aluno + Ranking via view | Desempenho por tema e limpeza da home |
| **4 — Engajar** | Conquistas, inventário, Minhas Turmas, Configurações | Tabelas já existem no schema, sem UI |

Fase 1 é obrigatória antes de qualquer outra. As demais podem ser reordenadas.

---

## 9. Critérios de aceite

Testar com **duas contas**: uma `aluno`, uma `professor`.

**Bloqueio (conta aluno)**

- [ ] Sidebar não mostra Criar Quiz, Meus Jogos nem Salas
- [ ] Navegar direto para `/dashboard/criar-quiz` redireciona para `/dashboard`
- [ ] `PesquisaPage` não oferece "Abrir sala" em nenhum card
- [ ] `POST /rest/v1/quizzes` com a chave anon do aluno retorna erro de RLS
- [ ] `rpc/criar_sala` com o aluno retorna *"Apenas professores podem abrir salas."*
- [ ] `GET /rest/v1/alternativas?select=correta` não devolve `correta` de pergunta em partida não revelada
- [ ] `GET /rest/v1/sala_respostas` devolve apenas as linhas do próprio aluno
- [ ] `PATCH /rest/v1/profiles` com `{"role":"professor"}` falha
- [ ] `PATCH /rest/v1/profiles` com `{"xp":999999}` falha
- [ ] `PATCH /rest/v1/profiles` com `{"name":"Novo Nome"}` funciona

**Visibilidade (conta aluno)**

- [ ] Meus Resultados lista todas as partidas do aluno e nenhuma de terceiros
- [ ] Detalhe da Partida mostra cada pergunta com a marcação do aluno e a correta
- [ ] Detalhe da Partida de sala **não encerrada** não revela gabarito
- [ ] Meus Temas soma por tema batendo com a contagem de `sala_respostas`
- [ ] Ranking não expõe e-mail em nenhuma resposta de rede
- [ ] Estados vazios (zero partidas) renderizam sem erro

**Não-regressão (conta professor)**

- [ ] Criar quiz, abrir sala, iniciar, revelar, avançar e encerrar continuam funcionando
- [ ] Placar ao vivo e Realtime seguem atualizando durante a partida
- [ ] `encerrar_partida` continua gravando `quiz_attempts` e creditando XP
