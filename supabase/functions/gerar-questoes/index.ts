// supabase/functions/gerar-questoes/index.ts
//
// Recebe um PDF (base64) e devolve questões de múltipla escolha geradas pela
// API da Anthropic. A chave fica como secret no Supabase, nunca no front-end:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB de PDF

const SCHEMA = {
  type: "object",
  properties: {
    questoes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pergunta: {
            type: "string",
            description: "O enunciado da pergunta.",
          },
          alternativas: {
            type: "array",
            description: "Exatamente 4 alternativas.",
            items: { type: "string" },
          },
          correta: {
            type: "integer",
            description: "Índice (0 a 3) da alternativa correta.",
            enum: [0, 1, 2, 3],
          },
        },
        required: ["pergunta", "alternativas", "correta"],
        additionalProperties: false,
      },
    },
  },
  required: ["questoes"],
  additionalProperties: false,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ erro: "Método não permitido." }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    return json(
      { erro: "ANTHROPIC_API_KEY não configurada no projeto Supabase." },
      500,
    );
  }

  let corpo;

  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo da requisição inválido." }, 400);
  }

  const {
    pdfBase64,
    quantidade = 5,
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

  const instrucoes = [
    `Gere exatamente ${total} questões de múltipla escolha em português do Brasil`,
    "com base no conteúdo do PDF anexado.",
    "",
    "Regras:",
    "- Cada questão tem exatamente 4 alternativas.",
    "- Apenas uma alternativa é correta; as outras três devem ser plausíveis, mas erradas.",
    "- Use somente informações presentes no documento. Não invente dados.",
    "- Não numere as alternativas (nada de \"a)\", \"1.\" etc.) — apenas o texto.",
    "- Não repita o mesmo assunto em duas questões.",
    `- Nível de dificuldade: ${dificuldade}.`,
    categoria ? `- Contexto/matéria: ${categoria}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const anthropic = new Anthropic({ apiKey });

    const resposta = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: instrucoes },
          ],
        },
      ],
    });

    if (resposta.stop_reason === "refusal") {
      return json(
        { erro: "O conteúdo do PDF não pôde ser processado." },
        422,
      );
    }

    const texto = resposta.content.find((bloco) => bloco.type === "text");

    if (!texto) {
      return json({ erro: "A IA não retornou questões." }, 502);
    }

    const { questoes } = JSON.parse(texto.text);

    // Descarta qualquer questão fora do formato esperado pelo formulário.
    const validas = (questoes ?? []).filter(
      (q) =>
        q &&
        typeof q.pergunta === "string" &&
        Array.isArray(q.alternativas) &&
        q.alternativas.length === 4 &&
        q.alternativas.every((alt) => typeof alt === "string" && alt.trim()) &&
        Number.isInteger(q.correta) &&
        q.correta >= 0 &&
        q.correta <= 3,
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

    return json(
      { erro: err?.message ?? "Falha ao gerar as questões." },
      500,
    );
  }
});
