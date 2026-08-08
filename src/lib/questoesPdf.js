// src/lib/questoesPdf.js
//
// Extrai questões de múltipla escolha (A–E) de um PDF que JÁ contém as
// questões prontas — não gera nada, não chama IA, não usa rede. Todo o
// trabalho acontece no navegador com o pdf.js (Mozilla).
//
// O módulo é dividido em duas metades de propósito:
//   - parsearQuestoes(texto): função pura, sem navegador, testável isolada.
//   - extrairTextoDoPdf(arquivo): a parte que depende do pdf.js.
// Por isso o pdf.js é importado dinamicamente lá dentro, e não no topo.

import { conferirAssinaturaPdf } from "./arquivoPdf";

export const TAMANHO_MAXIMO_PDF = 20 * 1024 * 1024; // 20 MB

export const MAX_ALTERNATIVAS = 5; // A, B, C, D, E

const LETRAS = ["A", "B", "C", "D", "E"];

// ---------------------------------------------------------------------
// Padrões de texto
// ---------------------------------------------------------------------

// "1.", "2)", "03 -", "Questão 4:", "QUESTAO 5"
const RE_QUESTAO = /^(?:quest(?:ão|ao)\s*)?(\d{1,3})\s*[).\-–—:]\s*(.*)$/i;

// "a) texto", "(A) texto", "b. texto", "c - texto"
// Exige pontuação depois da letra: sem isso, uma frase como "A prova foi..."
// seria confundida com a alternativa A.
const RE_ALTERNATIVA = /^\(?\s*([a-eA-E])\s*[).\-–—:]\s*(.+)$/;

// "Resposta: C", "Gabarito - B", "Resposta correta: (D)", "R: A"
const RE_RESPOSTA =
  /^(?:resposta|gabarito|resp|r|alternativa)\s*(?:correta|certa)?\s*[:\-–—]?\s*\(?\s*([a-eA-E])\s*\)?\s*[.]?$/i;

// Cabeçalho do bloco de gabarito no fim do documento.
const RE_CABECALHO_GABARITO =
  /^(gabarito|respostas|chave\s+de\s+respostas|gabarito\s+oficial)\s*:?\s*$/i;

// Pares "1-C", "2) A", "03: B" dentro do bloco de gabarito.
const RE_PAR_GABARITO = /(\d{1,3})\s*[).\-–—:]?\s*([a-eA-E])(?![a-zA-Z])/g;

// Duas ou mais alternativas na mesma linha: "a) Sim b) Não c) Talvez".
// Acontece quando o PDF usa colunas e o texto é achatado numa linha só.
const RE_ALTERNATIVA_INLINE = /(?:^|\s)\(?([a-eA-E])\)\s+/g;

// Linha que é só número de página, "Página 3", "3 de 12".
const RE_RODAPE = /^(p[áa]g(?:ina)?\.?\s*)?\d{1,3}(\s*(\/|de)\s*\d{1,3})?$/i;

function letraParaIndice(letra) {
  return LETRAS.indexOf(String(letra).toUpperCase());
}

// ---------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------

function normalizarLinhas(texto) {
  return String(texto)
    .replace(/\r\n?/g, "\n")
    // PDFs usam espaco fixo e outros espacos Unicode; normalizar aqui
    // evita que os padroes abaixo errem por causa disso.
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .split("\n")
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter((linha) => linha.length > 0 && !RE_RODAPE.test(linha));
}

// Quebra "a) Sim b) Não c) Talvez" em três linhas. Só age quando encontra
// pelo menos duas marcações, senão um texto comum com "a)" no meio seria
// picotado sem necessidade.
function dividirAlternativasNaLinha(linha) {
  const marcas = [...linha.matchAll(RE_ALTERNATIVA_INLINE)];

  if (marcas.length < 2) {
    return [linha];
  }

  // As letras precisam estar em sequência alfabética (a, b, c...). Se não
  // estiverem, provavelmente é texto comum e não uma fileira de alternativas.
  const letras = marcas.map((m) => m[1].toUpperCase());
  const emSequencia = letras.every(
    (letra, i) => i === 0 || letraParaIndice(letra) === letraParaIndice(letras[i - 1]) + 1
  );

  if (!emSequencia) {
    return [linha];
  }

  const partes = [];
  const inicioPrimeira = marcas[0].index + (marcas[0][0].startsWith(" ") ? 1 : 0);

  if (inicioPrimeira > 0) {
    partes.push(linha.slice(0, inicioPrimeira).trim());
  }

  marcas.forEach((marca, i) => {
    const inicio = marca.index + (marca[0].startsWith(" ") ? 1 : 0);
    const fim = i + 1 < marcas.length ? marcas[i + 1].index : linha.length;

    partes.push(linha.slice(inicio, fim).trim());
  });

  return partes.filter((parte) => parte.length > 0);
}

// ---------------------------------------------------------------------
// Bloco de gabarito no fim do documento
// ---------------------------------------------------------------------

// Muitas provas trazem as respostas só no fim, num bloco "GABARITO".
// Separa esse bloco do corpo e devolve um mapa numeroDaQuestao -> índice.
function extrairGabarito(linhas) {
  const inicio = linhas.findIndex((linha) => RE_CABECALHO_GABARITO.test(linha));

  if (inicio === -1) {
    return { gabarito: new Map(), corpo: linhas };
  }

  const gabarito = new Map();

  for (const linha of linhas.slice(inicio + 1)) {
    for (const par of linha.matchAll(RE_PAR_GABARITO)) {
      gabarito.set(Number(par[1]), letraParaIndice(par[2]));
    }
  }

  // Sem nenhum par reconhecido o cabeçalho era falso alarme (ex.: a palavra
  // "Respostas" no meio do enunciado). Nesse caso o corpo continua inteiro.
  if (gabarito.size === 0) {
    return { gabarito, corpo: linhas };
  }

  return { gabarito, corpo: linhas.slice(0, inicio) };
}

// ---------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------

function novaQuestao(numero, textoInicial) {
  return {
    numero,
    pergunta: textoInicial ? textoInicial.trim() : "",
    alternativas: [],
    correta: null,
  };
}

// Alternativa marcada como certa direto no texto: "c) Brasília *",
// "*c) Brasília" ou "c) Brasília (X)".
function separarMarcaDeCorreta(texto) {
  const limpo = texto
    .replace(/^\s*\*+\s*/, "")
    .replace(/\s*\*+\s*$/, "")
    .replace(/\s*\(\s*[xX]\s*\)\s*$/, "")
    .trim();

  return { texto: limpo, marcada: limpo !== texto.trim() };
}

/**
 * Converte o texto cru de uma prova em questões estruturadas.
 *
 * Função pura: mesma entrada, mesma saída, sem tocar em rede ou navegador.
 *
 * @param {string} texto
 * @returns {{questoes: Array, avisos: string[]}} questões no formato do
 *   formulário (`correta` é o índice da certa, ou `null` se não foi possível
 *   determinar) e avisos legíveis sobre o que foi descartado.
 */
export function parsearQuestoes(texto) {
  const linhasBrutas = normalizarLinhas(texto);
  const { gabarito, corpo } = extrairGabarito(linhasBrutas);

  const linhas = corpo.flatMap(dividirAlternativasNaLinha);

  const questoes = [];
  const avisos = [];

  let atual = null;
  // Para onde vai uma linha de continuação: o enunciado ou a última alternativa.
  let destino = null;

  function fechar() {
    if (!atual) {
      return;
    }

    // Com o texto das alternativas já completo, tira a marca de "certa" e,
    // se ainda não houver resposta, usa a marca como gabarito. Um "Resposta:"
    // explícito tem prioridade e por isso não é sobrescrito aqui.
    atual.alternativas = atual.alternativas.map((texto, indice) => {
      const { texto: limpo, marcada } = separarMarcaDeCorreta(texto);

      if (marcada && atual.correta === null) {
        atual.correta = indice;
      }

      return limpo;
    });

    questoes.push(atual);
    atual = null;
    destino = null;
  }

  for (const linha of linhas) {
    const alternativa = RE_ALTERNATIVA.exec(linha);

    // A checagem de alternativa vem antes da de resposta porque "a) Sim"
    // casaria com RE_RESPOSTA pelo atalho "r".
    if (alternativa && atual) {
      const indice = letraParaIndice(alternativa[1]);
      const esperado = atual.alternativas.length;

      // Só aceita a próxima letra da sequência. Isso evita que uma linha
      // solta "e) " no meio do enunciado vire alternativa fora de ordem.
      if (indice === esperado && indice < MAX_ALTERNATIVAS) {
        // A marca de "certa" (asterisco/(X)) só é procurada ao fechar a
        // questão: ela costuma vir no fim da alternativa, que pode ainda
        // estar quebrada em outras linhas.
        atual.alternativas.push(alternativa[2].trim());

        destino = "alternativa";
        continue;
      }
    }

    const resposta = RE_RESPOSTA.exec(linha);

    if (resposta && atual) {
      atual.correta = letraParaIndice(resposta[1]);
      destino = null;
      continue;
    }

    const questao = RE_QUESTAO.exec(linha);

    // Um número só reinicia a questão se a anterior já tiver alternativas.
    // Sem isso, um enunciado que cite "em 1500, o Brasil..." cortaria a questão.
    if (questao && (!atual || atual.alternativas.length > 0)) {
      fechar();

      atual = novaQuestao(Number(questao[1]), questao[2]);
      destino = "pergunta";
      continue;
    }

    if (!atual) {
      continue; // lixo antes da primeira questão (capa, instruções)
    }

    // Continuação: enunciado ou alternativa quebrados em várias linhas.
    if (destino === "pergunta") {
      atual.pergunta = `${atual.pergunta} ${linha}`.trim();
    } else if (destino === "alternativa" && atual.alternativas.length > 0) {
      const ultima = atual.alternativas.length - 1;
      atual.alternativas[ultima] = `${atual.alternativas[ultima]} ${linha}`.trim();
    }
  }

  fechar();

  // Aplica o bloco de gabarito do fim, sem sobrescrever uma resposta que já
  // veio marcada junto da questão.
  for (const questao of questoes) {
    if (questao.correta === null && gabarito.has(questao.numero)) {
      questao.correta = gabarito.get(questao.numero);
    }
  }

  const validas = [];

  for (const questao of questoes) {
    if (!questao.pergunta) {
      avisos.push(`Questão ${questao.numero} ignorada: enunciado vazio.`);
      continue;
    }

    if (questao.alternativas.length < 2) {
      avisos.push(
        `Questão ${questao.numero} ignorada: encontrei ${questao.alternativas.length} alternativa(s), o mínimo é 2.`
      );
      continue;
    }

    // Uma resposta fora do número de alternativas lidas é dado inconsistente:
    // melhor devolver sem resposta e deixar o professor escolher.
    if (questao.correta !== null && questao.correta >= questao.alternativas.length) {
      avisos.push(
        `Questão ${questao.numero}: o gabarito aponta a letra ${LETRAS[questao.correta]}, que não existe entre as alternativas lidas.`
      );
      questao.correta = null;
    }

    if (questao.correta === null) {
      avisos.push(
        `Questão ${questao.numero}: não achei a resposta correta — marque manualmente.`
      );
    }

    validas.push(questao);
  }

  if (validas.length === 0 && avisos.length === 0) {
    avisos.push(
      "Nenhuma questão reconhecida. O PDF precisa ter questões numeradas (1., 2....) com alternativas a), b), c)..."
    );
  }

  return { questoes: validas, avisos };
}

// ---------------------------------------------------------------------
// Leitura do PDF (pdf.js)
// ---------------------------------------------------------------------

export function validarPdf(arquivo) {
  if (!arquivo) {
    return "Selecione um arquivo PDF.";
  }

  if (arquivo.type !== "application/pdf") {
    return "O arquivo precisa ser um PDF.";
  }

  if (arquivo.size > TAMANHO_MAXIMO_PDF) {
    return "O PDF precisa ter no máximo 20 MB.";
  }

  return "";
}

// O pdf.js entrega pedaços soltos de texto com a posição de cada um, não
// linhas. Agrupa por altura (Y) para remontar as linhas originais.
// Exportada para poder ser testada com a saída real do pdf.js.
export function remontarLinhas(itens) {
  const porAltura = new Map();

  for (const item of itens) {
    if (!item.str || !item.str.trim()) {
      continue;
    }

    // Arredondar absorve as micro-variações de Y dentro de uma mesma linha.
    const y = Math.round(item.transform[5]);
    const chave = y;

    if (!porAltura.has(chave)) {
      porAltura.set(chave, []);
    }

    porAltura.get(chave).push({ x: item.transform[4], texto: item.str });
  }

  return [...porAltura.entries()]
    .sort((a, b) => b[0] - a[0]) // Y cresce para cima no PDF
    .map(([, pedacos]) =>
      pedacos
        .sort((a, b) => a.x - b.x)
        .map((pedaco) => pedaco.texto)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );
}

/**
 * Lê o texto de todas as páginas do PDF, no navegador.
 *
 * @param {File} arquivo
 * @returns {Promise<string>}
 */
export async function extrairTextoDoPdf(arquivo) {
  // Import dinâmico: o pdf.js só é baixado quando o professor realmente
  // envia um PDF, e mantém este módulo importável fora do navegador.
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await arquivo.arrayBuffer();

  // Quem sabe encerrar a leitura é a tarefa de carregamento, não o documento:
  // no pdf.js 6 o `PDFDocumentProxy` não tem mais `destroy()`.
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const documento = await tarefa.promise;

  const paginas = [];

  try {
    for (let numero = 1; numero <= documento.numPages; numero += 1) {
      const pagina = await documento.getPage(numero);
      const conteudo = await pagina.getTextContent();

      paginas.push(remontarLinhas(conteudo.items).join("\n"));

      pagina.cleanup();
    }
  } finally {
    await tarefa.destroy();
  }

  return paginas.join("\n");
}

/**
 * Caminho completo: PDF -> questões prontas para o formulário do quiz.
 *
 * @param {File} arquivo
 * @returns {Promise<{questoes: Array, avisos: string[]}>}
 */
export async function extrairQuestoesDoPdf(arquivo) {
  // A assinatura é conferida aqui, e não em `validarPdf`, porque exige ler o
  // arquivo — `validarPdf` é síncrona de propósito, para o formulário dar
  // resposta imediata sobre tipo e tamanho.
  const problema = validarPdf(arquivo) || (await conferirAssinaturaPdf(arquivo));

  if (problema) {
    throw new Error(problema);
  }

  const texto = await extrairTextoDoPdf(arquivo);

  if (!texto.trim()) {
    throw new Error(
      "Não consegui ler texto neste PDF. Se ele for digitalizado (imagem), será preciso um PDF com texto de verdade."
    );
  }

  return parsearQuestoes(texto);
}
