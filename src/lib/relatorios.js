// src/lib/relatorios.js
//
// O que o aluno consegue ver do proprio historico.
//
// O historico nasce de sala_jogadores, nao de quiz_attempts: quiz_attempts
// guarda o placar final mas nao guarda de qual sala veio, entao nao daria
// para abrir o detalhe pergunta a pergunta a partir dele.

import { supabase } from "./supabaseClient";

// Uma linha por partida jogada, da mais recente para a mais antiga, ja com
// a colocacao do aluno naquela sala.
export async function meuHistorico(perfilId) {
  if (!perfilId) return [];

  const { data, error } = await supabase
    .from("sala_jogadores")
    .select(
      "id, sala_id, pontos, acertos, melhor_streak, entrou_em, " +
        "salas(codigo, estado, total_perguntas, created_at, " +
        "quizzes(title, category, difficulty))"
    )
    .eq("player_id", perfilId)
    .order("entrou_em", { ascending: false });

  if (error) throw new Error(error.message);

  const partidas = data ?? [];

  if (partidas.length === 0) return [];

  // A colocacao depende dos pontos de todo mundo que jogou as mesmas salas.
  const { data: todos, error: erroTodos } = await supabase
    .from("sala_jogadores")
    .select("sala_id, player_id, pontos")
    .in(
      "sala_id",
      partidas.map((partida) => partida.sala_id)
    );

  if (erroTodos) throw new Error(erroTodos.message);

  return partidas.map((partida) => {
    const daSala = (todos ?? [])
      .filter((jogador) => jogador.sala_id === partida.sala_id)
      .sort((a, b) => b.pontos - a.pontos);

    return {
      ...partida,
      colocacao: daSala.findIndex((jogador) => jogador.player_id === perfilId) + 1,
      participantes: daSala.length,
    };
  });
}

// Totais para a faixa de resumo. Sai do proprio historico para nao bater no
// banco de novo.
export function resumoDoHistorico(historico) {
  const perguntas = historico.reduce(
    (total, partida) => total + (partida.salas?.total_perguntas ?? 0),
    0
  );

  const acertos = historico.reduce(
    (total, partida) => total + (partida.acertos ?? 0),
    0
  );

  return {
    partidas: historico.length,
    pontos: historico.reduce((total, partida) => total + (partida.pontos ?? 0), 0),
    melhorStreak: historico.reduce(
      (maior, partida) => Math.max(maior, partida.melhor_streak ?? 0),
      0
    ),
    aproveitamento: perguntas > 0 ? Math.round((acertos / perguntas) * 100) : null,
  };
}

// Detalhe de uma partida: o que o aluno marcou em cada pergunta, qual era a
// resposta certa e a explicacao. So abre com a partida encerrada, senao
// viraria gabarito no meio do jogo.
export async function meuDetalhePartida(salaId, perfilId) {
  const { data: jogador, error: erroJogador } = await supabase
    .from("sala_jogadores")
    .select("id, pontos, acertos, melhor_streak")
    .eq("sala_id", salaId)
    .eq("player_id", perfilId)
    .maybeSingle();

  if (erroJogador) throw new Error(erroJogador.message);
  if (!jogador) throw new Error("Você não participou dessa partida.");

  const { data: sala, error: erroSala } = await supabase
    .from("salas")
    .select(
      "id, codigo, estado, total_perguntas, created_at, " +
        "quizzes(title, category, difficulty)"
    )
    .eq("id", salaId)
    .single();

  if (erroSala) throw new Error(erroSala.message);

  if (sala.estado !== "encerrada") {
    throw new Error(
      "Essa partida ainda está em andamento. As respostas aparecem quando ela terminar."
    );
  }

  const { data: respostas, error: erroRespostas } = await supabase
    .from("sala_respostas")
    .select(
      "pergunta_index, alternativa_id, correta, tempo_ms, pontos, " +
        "perguntas(id, enunciado, explicacao, categoria)"
    )
    .eq("jogador_id", jogador.id)
    .order("pergunta_index", { ascending: true });

  if (erroRespostas) throw new Error(erroRespostas.message);

  const lista = respostas ?? [];

  const perguntaIds = lista
    .map((resposta) => resposta.perguntas?.id)
    .filter(Boolean);

  let alternativas = [];

  if (perguntaIds.length > 0) {
    const { data, error } = await supabase
      .from("alternativas")
      .select("id, pergunta_id, texto, correta, ordem")
      .in("pergunta_id", perguntaIds)
      .order("ordem", { ascending: true });

    if (error) throw new Error(error.message);

    alternativas = data ?? [];
  }

  return {
    sala,
    jogador,
    perguntas: lista.map((resposta) => {
      const doGrupo = alternativas.filter(
        (alternativa) => alternativa.pergunta_id === resposta.perguntas?.id
      );

      return {
        indice: resposta.pergunta_index,
        enunciado: resposta.perguntas?.enunciado ?? "",
        explicacao: resposta.perguntas?.explicacao ?? "",
        acertou: resposta.correta,
        tempoMs: resposta.tempo_ms ?? 0,
        pontos: resposta.pontos ?? 0,
        // Sem alternativa marcada = tempo esgotado.
        minha:
          doGrupo.find(
            (alternativa) => alternativa.id === resposta.alternativa_id
          ) ?? null,
        gabarito: doGrupo.find((alternativa) => alternativa.correta) ?? null,
      };
    }),
  };
}

// Aproveitamento agrupado por tema. Nao existe tabela de temas: o tema vem
// de perguntas.categoria, com o category do quiz como reserva.
export async function meuDesempenhoPorTema(perfilId) {
  if (!perfilId) return [];

  const { data: jogadores, error: erroJogadores } = await supabase
    .from("sala_jogadores")
    .select("id")
    .eq("player_id", perfilId);

  if (erroJogadores) throw new Error(erroJogadores.message);

  const ids = (jogadores ?? []).map((jogador) => jogador.id);

  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("sala_respostas")
    .select("correta, perguntas(categoria), salas(quizzes(category))")
    .in("jogador_id", ids);

  if (error) throw new Error(error.message);

  const porTema = new Map();

  for (const resposta of data ?? []) {
    const tema =
      resposta.perguntas?.categoria?.trim() ||
      resposta.salas?.quizzes?.category?.trim() ||
      "Sem tema";

    const atual = porTema.get(tema) ?? { tema, respondidas: 0, acertos: 0 };

    atual.respondidas += 1;

    if (resposta.correta) atual.acertos += 1;

    porTema.set(tema, atual);
  }

  // Pior aproveitamento primeiro: o que o aluno precisa estudar vem no topo.
  return [...porTema.values()]
    .map((item) => ({
      ...item,
      aproveitamento: Math.round((item.acertos / item.respondidas) * 100),
    }))
    .sort((a, b) => a.aproveitamento - b.aproveitamento);
}

// --- Formatacao usada pelas telas de relatorio -------------------------

export function formatarData(valor) {
  if (!valor) return "-";

  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarTempo(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}
