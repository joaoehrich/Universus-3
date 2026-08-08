// src/lib/partida.js
//
// Tudo o que a partida ao vivo precisa falar com o Supabase.
// As regras de pontuacao moram no banco (funcoes SECURITY DEFINER); aqui
// ficam so os atalhos das chamadas e as formulas que a tela precisa
// mostrar antes de o servidor responder.

import { supabase } from "./supabaseClient";

// Cores das alternativas, na ordem em que aparecem na tela.
// Uma cor por alternativa, ate E. Sem a quinta, o indice 4 daria a volta
// pelo modulo e a alternativa E ficaria com a mesma cor da A.
export const CORES_ALTERNATIVA = [
  "#7C3AED",
  "#2563EB",
  "#EC4899",
  "#F59E0B",
  "#06B6D4",
];

export const LETRAS_ALTERNATIVA = ["A", "B", "C", "D", "E", "F"];

export const XP_POR_NIVEL = 500;

// Mesmas contas do banco, usadas so para mostrar o resultado na tela.
export function xpDaPartida(pontos) {
  return Math.max(0, Math.round((pontos ?? 0) / 10));
}

export function nivelDoXp(xp) {
  return Math.max(1, Math.floor((xp ?? 0) / XP_POR_NIVEL) + 1);
}

export function progressoDoNivel(xp) {
  return ((xp ?? 0) % XP_POR_NIVEL) / XP_POR_NIVEL;
}

// Combo: 1.0x sem sequencia, +0.2x por acerto seguido, teto de 2.0x.
export function multiplicadorDoCombo(streak) {
  return Math.min(2, 1 + 0.2 * (streak ?? 0));
}

async function chamar(nome, parametros) {
  const { data, error } = await supabase.rpc(nome, parametros);

  if (error) throw new Error(error.message);

  return data;
}

// As funcoes que devolvem uma linha de salas podem chegar como objeto ou
// como lista de um item, dependendo de como o PostgREST resolve o tipo.
function primeiro(retorno) {
  return Array.isArray(retorno) ? retorno[0] : retorno;
}

// --- Anfitriao ---------------------------------------------------------

export async function criarSala(quizId) {
  return primeiro(await chamar("criar_sala", { p_quiz_id: quizId }));
}

export function iniciarPartida(salaId) {
  return chamar("iniciar_partida", { p_sala_id: salaId });
}

export function revelarResposta(salaId) {
  return chamar("revelar_resposta", { p_sala_id: salaId });
}

export function proximaPergunta(salaId) {
  return chamar("proxima_pergunta", { p_sala_id: salaId });
}

export function encerrarPartida(salaId) {
  return chamar("encerrar_partida", { p_sala_id: salaId });
}

// --- Aluno -------------------------------------------------------------

export function entrarSala(codigo) {
  return chamar("entrar_sala", { p_codigo: codigo });
}

export function responderPergunta(salaId, alternativaId) {
  return chamar("responder_pergunta", {
    p_sala_id: salaId,
    p_alternativa_id: alternativaId,
  });
}

// --- Comum -------------------------------------------------------------

export function perguntaDaSala(salaId) {
  return chamar("pergunta_da_sala", { p_sala_id: salaId });
}

export async function buscarSalaPorCodigo(codigo) {
  const { data, error } = await supabase
    .from("salas")
    .select("*, quizzes(title, category, difficulty)")
    .eq("codigo", (codigo ?? "").trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

export async function listarJogadores(salaId) {
  const { data, error } = await supabase
    .from("sala_jogadores")
    .select("id, player_id, nome, pontos, acertos, streak, melhor_streak")
    .eq("sala_id", salaId)
    .order("pontos", { ascending: false })
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}

// Quantos ja responderam a pergunta que esta no ar (painel do anfitriao).
export async function contarRespostas(salaId, perguntaIndex) {
  const { count, error } = await supabase
    .from("sala_respostas")
    .select("id", { count: "exact", head: true })
    .eq("sala_id", salaId)
    .eq("pergunta_index", perguntaIndex);

  if (error) throw new Error(error.message);

  return count ?? 0;
}
