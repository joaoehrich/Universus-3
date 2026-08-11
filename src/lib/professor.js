// src/lib/professor.js
//
// Painel da turma. Todas as RPCs daqui filtram por salas.host_id =
// auth.uid() dentro do banco, entao o professor so enxerga as proprias
// salas e o aluno que chamar recebe lista vazia - nao existe parametro
// de "de quem sao os dados" para alguem forjar.

import { supabase } from "./supabaseClient";

async function chamar(nome, parametros) {
  const { data, error } = await supabase.rpc(nome, parametros);

  if (error) throw new Error(error.message);

  return data;
}

// KPIs do topo do painel. Vem como jsonb unico para a tela nao precisar
// somar nada.
export async function resumoProfessor() {
  const resumo = await chamar("resumo_professor");

  return (
    resumo ?? {
      quizzes: 0,
      salas: 0,
      partidas_encerradas: 0,
      alunos_unicos: 0,
      respondidas: 0,
      acertos: 0,
      aproveitamento: 0,
      media_participantes: 0,
    }
  );
}

// Uma linha por sala aberta pelo professor, da mais recente para a mais
// antiga.
export async function partidasDoProfessor(limite = 50) {
  return (await chamar("partidas_do_professor", { p_limite: limite })) ?? [];
}

// Placar da sala + acerto por pergunta + distribuicao das alternativas.
// Lanca "Essa sala nao e sua." quando o professor nao e o anfitriao.
export function detalheSalaProfessor(salaId) {
  return chamar("detalhe_sala_professor", { p_sala_id: salaId });
}

// Aproveitamento da turma por materia/subcategoria, pior primeiro.
export async function desempenhoProfessorPorTema() {
  return (await chamar("desempenho_professor_por_tema")) ?? [];
}

// Todos os alunos que ja passaram pelas salas do professor, somados.
export async function alunosDoProfessor(limite = 100) {
  return (await chamar("alunos_do_professor", { p_limite: limite })) ?? [];
}
