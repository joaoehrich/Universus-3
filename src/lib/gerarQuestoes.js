// src/lib/gerarQuestoes.js

import { supabase } from "./supabaseClient";

export const TAMANHO_MAXIMO_PDF = 10 * 1024 * 1024; // 10 MB

// O FileReader devolve "data:application/pdf;base64,XXXX" — a API precisa
// apenas da parte depois da vírgula.
function lerComoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      const resultado = String(leitor.result);
      resolve(resultado.slice(resultado.indexOf(",") + 1));
    };

    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));

    leitor.readAsDataURL(arquivo);
  });
}

export function validarPdf(arquivo) {
  if (!arquivo) {
    return "Selecione um arquivo PDF.";
  }

  if (arquivo.type !== "application/pdf") {
    return "O arquivo precisa ser um PDF.";
  }

  if (arquivo.size > TAMANHO_MAXIMO_PDF) {
    return "O PDF precisa ter no máximo 10 MB.";
  }

  return "";
}

// O supabase-js devolve o erro como valor, com a resposta HTTP em `context`.
// Sem isso, qualquer falha vira uma mensagem genérica que não diz o que houve.
async function descreverErro(error) {
  const resposta = error.context;

  // Sem status HTTP o navegador bloqueou antes de receber resposta. O caso
  // mais comum não é falta de internet: quando a função não está publicada,
  // o preflight OPTIONS recebe 404 sem cabeçalhos CORS e o POST nem chega a
  // ser enviado — por isso o 404 nunca aparece aqui.
  if (!resposta || typeof resposta.status !== "number") {
    return "Não foi possível chamar a função 'gerar-questoes'. Verifique se ela está publicada no Supabase e se você está online.";
  }

  if (resposta.status === 404) {
    return "A função 'gerar-questoes' não está publicada no Supabase.";
  }

  if (resposta.status === 401 || resposta.status === 403) {
    return "Sem permissão para chamar a função. Faça login novamente.";
  }

  const corpo = await resposta
    .clone()
    .json()
    .catch(() => null);

  if (corpo?.erro) {
    return corpo.erro;
  }

  return `Falha ao gerar as questões (erro ${resposta.status}).`;
}

// Envia o PDF para a Edge Function e devolve as questões já no formato
// usado pelo formulário de criação de quiz.
export async function gerarQuestoesDoPdf({
  arquivo,
  quantidade = 5,
  dificuldade = "Médio",
  categoria = "",
}) {
  const problema = validarPdf(arquivo);

  if (problema) {
    throw new Error(problema);
  }

  const pdfBase64 = await lerComoBase64(arquivo);

  const { data, error } = await supabase.functions.invoke("gerar-questoes", {
    body: {
      pdfBase64,
      quantidade,
      dificuldade,
      categoria,
    },
  });

  if (error) {
    throw new Error(await descreverErro(error));
  }

  if (data?.erro) {
    throw new Error(data.erro);
  }

  if (!Array.isArray(data?.questoes) || data.questoes.length === 0) {
    throw new Error("Nenhuma questão foi gerada a partir deste PDF.");
  }

  return data.questoes.map((questao) => ({
    pergunta: questao.pergunta,
    alternativas: questao.alternativas,
    correta: questao.correta,
  }));
}
