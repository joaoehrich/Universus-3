// src/lib/relatorios.js
//
// O que o aluno consegue ver do proprio historico.
//
// O historico nasce de sala_jogadores, nao de quiz_attempts: quiz_attempts
// guarda o placar final mas nao guarda de qual sala veio, entao nao daria
// para abrir o detalhe pergunta a pergunta a partir dele.
//
// A colocacao em cada partida agora vem de window function no banco
// (meu_historico). Antes eram duas queries por tela - uma para as
// partidas do aluno e outra para os pontos de todo mundo que jogou
// aquelas salas - so para descobrir em que lugar ele ficou.

import { supabase } from "./supabaseClient";

async function chamar(nome, parametros) {
  const { data, error } = await supabase.rpc(nome, parametros);

  if (error) throw new Error(error.message);

  return data;
}

// Uma linha por partida jogada, da mais recente para a mais antiga, ja
// com colocacao, participantes e aproveitamento.
//
// perfilId nao vai para o banco: a RPC usa auth.uid(). O parametro
// continua na assinatura porque a tela ja o tem em maos e ele evita a
// chamada enquanto o perfil ainda esta carregando.
export async function meuHistorico(perfilId) {
  if (!perfilId) return [];

  return (await chamar("meu_historico", { p_limite: 100 })) ?? [];
}

// Totais para a faixa de resumo. Sai do proprio historico para nao bater
// no banco de novo.
export function resumoDoHistorico(historico) {
  const partidas = historico ?? [];

  const perguntas = partidas.reduce(
    (total, partida) => total + (partida.total_perguntas ?? 0),
    0
  );

  const acertos = partidas.reduce(
    (total, partida) => total + (partida.acertos ?? 0),
    0
  );

  return {
    partidas: partidas.length,
    pontos: partidas.reduce((total, partida) => total + (partida.pontos ?? 0), 0),
    melhorStreak: partidas.reduce(
      (maior, partida) => Math.max(maior, partida.melhor_streak ?? 0),
      0
    ),
    aproveitamento: perguntas > 0 ? Math.round((acertos / perguntas) * 100) : 0,
    acertos,
    perguntas,
    vitorias: partidas.filter((partida) => partida.colocacao === 1).length,
    podios: partidas.filter(
      (partida) => partida.colocacao > 0 && partida.colocacao <= 3
    ).length,
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
        "quizzes(title, category, subcategoria, difficulty)"
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
        "perguntas(id, enunciado, explicacao, categoria, subcategoria)"
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
        categoria: resposta.perguntas?.categoria ?? sala.quizzes?.category ?? "",
        subcategoria:
          resposta.perguntas?.subcategoria ?? sala.quizzes?.subcategoria ?? null,
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

// Aproveitamento agrupado por materia e subcategoria, pior primeiro: o
// que o aluno precisa estudar aparece no topo. O tema vem de
// perguntas.categoria/subcategoria, com o quiz como reserva quando a
// pergunta e antiga e nao tem tema proprio.
export async function meuDesempenhoPorTema(perfilId) {
  if (!perfilId) return [];

  const linhas = (await chamar("meu_desempenho_temas")) ?? [];

  // `tema` e o rotulo pronto para a tela e mantem compatibilidade com a
  // versao antiga desta funcao, que so devolvia a categoria.
  return linhas.map((linha) => ({
    ...linha,
    tema: linha.subcategoria
      ? `${linha.categoria} · ${linha.subcategoria}`
      : linha.categoria,
  }));
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
