// @ts-nocheck — este arquivo roda no Deno (Supabase Edge Functions), não no
// Vite. Sem a extensão Deno instalada, o VS Code marcaria `Deno` como erro.
// Instalando a extensão `denoland.vscode-deno`, apague esta linha para
// recuperar a checagem de tipos de verdade.
//
// supabase/functions/gerar-questoes/index.ts
//
// Recebe um PDF (base64) e devolve questões de múltipla escolha geradas pela
// API do Google Gemini (plano gratuito). A chave fica como secret no Supabase,
// nunca no front-end:
//   Project Settings > Edge Functions > Secrets > GEMINI_API_KEY

// O Google fecha modelos antigos para projetos novos: o `gemini-2.5-flash`
// passou a responder "no longer available to new users" para chaves recentes.
// Quando isso acontecer de novo, basta criar/editar o secret GEMINI_MODELO em
// Project Settings > Edge Functions > Secrets com um nome da lista de
// https://ai.google.dev/gemini-api/docs/models — sem mexer no código nem
// redeployar a função.
const MODELO = Deno.env.get("GEMINI_MODELO") || "gemini-3.6-flash";

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB de PDF

// A plataforma tem um teto de tempo por invocação; bater nele derruba a
// conexão sem corpo de resposta, e o front não tem como explicar o que houve.
// Desistir do Gemini antes disso permite devolver um erro legível. Fica abaixo
// do limite do cliente (120 s em `src/lib/gerarQuestoes.js`) para que esta
// resposta chegue antes de ele desistir.
const TEMPO_LIMITE_MS = 90_000;

interface Requisicao {
  pdfBase64?: string;
  quantidade?: number;
  alternativas?: number;
  dificuldade?: string;
  categoria?: string;
}

interface Questao {
  pergunta: string;
  alternativas: string[];
  correta: number;
}

// Schema no formato do Gemini (subconjunto do OpenAPI, tipos em maiúsculas).
// Garante que a resposta volte como JSON no formato que o formulário espera.
const SCHEMA = {
  type: "OBJECT",
  properties: {
    questoes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          pergunta: { type: "STRING" },
          alternativas: { type: "ARRAY", items: { type: "STRING" } },
          correta: { type: "INTEGER" },
        },
        required: ["pergunta", "alternativas", "correta"],
      },
    },
  },
  required: ["questoes"],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// A resposta do modelo é validada aqui: o formulário do quiz aceita de 2 a 5
// alternativas (A–E), todas preenchidas, e um índice dentro dessa faixa.
function ehQuestaoValida(valor: unknown, total: number): valor is Questao {
  if (typeof valor !== "object" || valor === null) return false;

  const { pergunta, alternativas, correta } = valor as Record<string, unknown>;

  return (
    typeof pergunta === "string" &&
    pergunta.trim().length > 0 &&
    Array.isArray(alternativas) &&
    alternativas.length === total &&
    alternativas.every(
      (alt) => typeof alt === "string" && alt.trim().length > 0,
    ) &&
    typeof correta === "number" &&
    Number.isInteger(correta) &&
    correta >= 0 &&
    correta < total
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ erro: "Método não permitido." }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return json(
      { erro: "GEMINI_API_KEY não configurada no projeto Supabase." },
      500,
    );
  }

  let corpo: Requisicao;

  try {
    corpo = (await req.json()) as Requisicao;
  } catch {
    return json({ erro: "Corpo da requisição inválido." }, 400);
  }

  const {
    pdfBase64,
    quantidade = 5,
    alternativas = 5,
    dificuldade = "Médio",
    categoria = "",
  } = corpo ?? {};

  if (typeof pdfBase64 !== "string" || !pdfBase64) {
    return json({ erro: "Envie o PDF no campo pdfBase64." }, 400);
  }

  // O base64 ocupa ~4/3 do tamanho original do arquivo.
  if ((pdfBase64.length * 3) / 4 > MAX_BYTES) {
    return json({ erro: "PDF maior que 10 MB." }, 413);
  }

  const total = Math.min(Math.max(Number(quantidade) || 5, 1), 10);

  // O formulário mostra 5 campos (A–E), mas aceita menos. Quem chama decide.
  const porQuestao = Math.min(Math.max(Number(alternativas) || 5, 2), 5);

  const instrucoes = [
    `Gere exatamente ${total} questões de múltipla escolha em português do Brasil`,
    "com base no conteúdo do PDF anexado.",
    "",
    "Regras:",
    `- Cada questão tem exatamente ${porQuestao} alternativas.`,
    `- Apenas uma alternativa é correta; as outras ${porQuestao - 1} devem ser plausíveis, mas erradas.`,
    `- O campo "correta" é o índice (0 a ${porQuestao - 1}) da alternativa correta.`,
    "- Use somente informações presentes no documento. Não invente dados.",
    '- Não numere as alternativas (nada de "a)", "1." etc.) — apenas o texto.',
    "- Não repita o mesmo assunto em duas questões.",
    `- Nível de dificuldade: ${dificuldade}.`,
    categoria ? `- Contexto/matéria: ${categoria}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              { text: instrucoes },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      // 429 = cota gratuita estourada; 400 costuma ser chave inválida.
      return json(
        {
          erro: dados?.error?.message ??
            `A API do Gemini respondeu ${resposta.status}.`,
        },
        resposta.status === 429 ? 429 : 502,
      );
    }

    if (dados?.promptFeedback?.blockReason) {
      return json(
        { erro: "O conteúdo do PDF foi bloqueado pelos filtros do Gemini." },
        422,
      );
    }

    const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof texto !== "string") {
      return json({ erro: "A IA não retornou questões." }, 502);
    }

    const conteudo = JSON.parse(texto) as { questoes?: unknown };
    const geradas = Array.isArray(conteudo.questoes) ? conteudo.questoes : [];
    // Lambda explícita: passar a função direto faria o `filter` mandar o
    // índice do array como segundo argumento no lugar do total esperado.
    const validas = geradas.filter((questao) =>
      ehQuestaoValida(questao, porQuestao)
    );

    if (validas.length === 0) {
      return json(
        { erro: "Não foi possível gerar questões a partir deste PDF." },
        422,
      );
    }

    return json({ questoes: validas.slice(0, total) });
  } catch (err) {
    console.error("Erro ao gerar questões:", err);

    // `AbortSignal.timeout` rejeita o fetch com um DOMException "TimeoutError".
    if (err instanceof Error && err.name === "TimeoutError") {
      return json(
        {
          erro:
            "O Gemini passou de 90 segundos sem responder. Tente um PDF com menos páginas ou peça menos perguntas.",
        },
        504,
      );
    }

    return json(
      {
        erro: err instanceof Error ? err.message : "Falha ao gerar as questões.",
      },
      500,
    );
  }
});
