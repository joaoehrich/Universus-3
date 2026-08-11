// src/components/ui/formato.js
//
// Estilo do painel padrao e as faixas de cor usadas pelas telas de ranking e
// relatorio. Fica fora de src/lib de proposito: aqui e so apresentacao,
// nenhuma linha toca no banco.

export const PAINEL = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "20px",
};

export const CORES = {
  roxo: "#7C3AED",
  lilas: "#A78BFA",
  azul: "#2563EB",
  verde: "#10B981",
  ambar: "#F59E0B",
  vermelho: "#EF4444",
  apagado: "rgba(255,255,255,.35)",
};

export const MEDALHAS = ["🥇", "🥈", "🥉"];

// Um numero sozinho nao comunica: a faixa da nome e cor ao aproveitamento.
export function faixaAproveitamento(valor) {
  if (valor === null || valor === undefined) {
    return { texto: "Sem dados", cor: CORES.apagado };
  }

  if (valor >= 80) return { texto: "Forte 💪", cor: CORES.verde };
  if (valor >= 50) return { texto: "Em progresso 📈", cor: CORES.ambar };

  return { texto: "A treinar 📚", cor: CORES.vermelho };
}

export function corAproveitamento(valor) {
  return faixaAproveitamento(valor).cor;
}

// "Matematica · Potenciacao" — a subcategoria e opcional em todo o sistema.
export function rotuloTema(categoria, subcategoria) {
  const materia = (categoria ?? "").trim() || "Sem matéria";
  const assunto = (subcategoria ?? "").trim();

  return assunto ? `${materia} · ${assunto}` : materia;
}

export function percentual(parte, total) {
  if (!total) return 0;

  return Math.round((parte / total) * 100);
}

// O catalogo e a lista fixa de materias podem chegar como texto simples ou
// como objeto ({ nome, quizzes, perguntas }). Normaliza os dois para texto.
export function nomeDaSubcategoria(item) {
  if (!item) return "";
  if (typeof item === "string") return item;

  return item.nome ?? item.subcategoria ?? "";
}

export function nomeDaCategoria(item) {
  if (!item) return "";
  if (typeof item === "string") return item;

  return item.categoria ?? item.nome ?? "";
}

// Junta as materias sugeridas (MATERIAS) com as que ja existem no sistema
// (catalogoCategorias), sem repetir, para popular <select> e <datalist>.
export function unirCategorias(catalogo = [], materias = []) {
  const nomes = new Set();

  for (const item of [...materias, ...catalogo]) {
    const nome = nomeDaCategoria(item).trim();

    if (nome) nomes.add(nome);
  }

  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Subcategorias de uma materia: as sugeridas primeiro, depois as que outros
// professores ja cadastraram.
export function subcategoriasDaCategoria(categoria, catalogo = [], materias = []) {
  if (!categoria) return [];

  const nomes = new Set();

  for (const grupo of [...materias, ...catalogo]) {
    if (nomeDaCategoria(grupo) !== categoria) continue;

    for (const item of grupo.subcategorias ?? []) {
      const nome = nomeDaSubcategoria(item).trim();

      if (nome) nomes.add(nome);
    }
  }

  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
