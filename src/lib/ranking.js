// src/lib/ranking.js
//
// Catalogo de materias e ranking.
//
// O ranking sai pronto do banco (ranking_geral / minha_posicao_ranking):
// posicao, aproveitamento e desempate precisam ser calculados sobre a
// tabela inteira, e nao sobre o pedaco que a tela recebeu.

import { supabase } from "./supabaseClient";

// Sugestoes de materia/subcategoria para o formulario de Criar Quiz e
// para os filtros. E so um ponto de partida: o professor pode digitar
// uma subcategoria que nao esta aqui, e o catalogo do banco (abaixo)
// devolve o que realmente esta em uso.
export const MATERIAS = [
  {
    nome: "Matemática",
    subcategorias: [
      "Aritmética",
      "Frações",
      "Potenciação",
      "Álgebra",
      "Geometria",
      "Porcentagem",
      "Estatística",
    ],
  },
  {
    nome: "Português",
    subcategorias: [
      "Ortografia",
      "Gramática",
      "Interpretação de texto",
      "Literatura",
      "Redação",
      "Verbos",
    ],
  },
  {
    nome: "História",
    subcategorias: [
      "Brasil Colônia",
      "Brasil República",
      "Idade Média",
      "Segunda Guerra Mundial",
      "Revolução Industrial",
      "Antiguidade",
    ],
  },
  {
    nome: "Geografia",
    subcategorias: [
      "Cartografia",
      "Relevo",
      "Clima",
      "População",
      "Geopolítica",
      "Geografia do Brasil",
    ],
  },
  {
    nome: "Ciências",
    subcategorias: [
      "Corpo humano",
      "Meio ambiente",
      "Sistema solar",
      "Matéria e energia",
      "Seres vivos",
    ],
  },
  {
    nome: "Inglês",
    subcategorias: [
      "Vocabulário",
      "Verb to be",
      "Tempos verbais",
      "Interpretação de texto",
      "Phrasal verbs",
    ],
  },
  {
    nome: "Física",
    subcategorias: [
      "Cinemática",
      "Dinâmica",
      "Energia",
      "Óptica",
      "Eletricidade",
      "Termologia",
    ],
  },
  {
    nome: "Química",
    subcategorias: [
      "Tabela periódica",
      "Ligações químicas",
      "Reações químicas",
      "Soluções",
      "Química orgânica",
    ],
  },
  {
    nome: "Biologia",
    subcategorias: [
      "Citologia",
      "Genética",
      "Ecologia",
      "Evolução",
      "Botânica",
      "Zoologia",
    ],
  },
  {
    nome: "Artes",
    subcategorias: ["História da arte", "Música", "Teatro", "Artes visuais"],
  },
  {
    nome: "Educação Física",
    subcategorias: ["Esportes coletivos", "Saúde e corpo", "Jogos e brincadeiras"],
  },
  {
    nome: "Outros",
    subcategorias: ["Tecnologia", "Atualidades", "Conhecimentos gerais"],
  },
];

async function chamar(nome, parametros) {
  const { data, error } = await supabase.rpc(nome, parametros);

  if (error) throw new Error(error.message);

  return data;
}

// Pares categoria/subcategoria que existem de verdade no banco, ja
// agrupados por materia. Alimenta os <select> do ranking e o <datalist>
// do Criar Quiz.
export async function catalogoCategorias() {
  const linhas = (await chamar("catalogo_categorias")) ?? [];

  const porCategoria = new Map();

  for (const linha of linhas) {
    const categoria = linha.categoria;

    if (!categoria) continue;

    const atual = porCategoria.get(categoria) ?? { categoria, subcategorias: [] };

    // A RPC devolve uma linha com subcategoria null (as perguntas soltas
    // da materia); ela conta para a materia, mas nao vira item da lista.
    if (linha.subcategoria) {
      atual.subcategorias.push({
        nome: linha.subcategoria,
        quizzes: linha.quizzes ?? 0,
        perguntas: linha.perguntas ?? 0,
      });
    }

    porCategoria.set(categoria, atual);
  }

  return [...porCategoria.values()].sort((a, b) =>
    a.categoria.localeCompare(b.categoria, "pt-BR")
  );
}

// Ranking ja ordenado, com a posicao vinda do banco. Filtro vazio =
// todas as materias / todo o periodo.
export function rankingGeral({
  categoria = null,
  subcategoria = null,
  periodo = "sempre",
  limite = 50,
} = {}) {
  return chamar("ranking_geral", {
    p_categoria: categoria || null,
    p_subcategoria: subcategoria || null,
    p_periodo: periodo || "sempre",
    p_limite: limite,
  }).then((linhas) => linhas ?? []);
}

// A linha do usuario logado com a posicao real, mesmo que ele esteja
// fora do top N. Devolve null quando ele ainda nao jogou no recorte.
export async function minhaPosicao({
  categoria = null,
  subcategoria = null,
  periodo = "sempre",
} = {}) {
  const linhas = await chamar("minha_posicao_ranking", {
    p_categoria: categoria || null,
    p_subcategoria: subcategoria || null,
    p_periodo: periodo || "sempre",
  });

  return linhas?.[0] ?? null;
}
