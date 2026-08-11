// src/components/resultados/CartaoPergunta.jsx
//
// Uma pergunta da sala vista pelo professor: quanto a turma acertou, quanto
// tempo levou e para onde foram os erros. A distribuicao por alternativa e o
// que mostra se a turma errou por distracao ou por um conceito trocado.

import { formatarTempo } from "../../lib/relatorios";
import { PAINEL, CORES, corAproveitamento } from "../ui/formato";

const LETRAS = ["A", "B", "C", "D", "E"];

function CartaoPergunta({ pergunta, total, destaque }) {
  const cor = corAproveitamento(pergunta.aproveitamento);

  return (
    <div
      className="card border-0"
      style={{
        ...PAINEL,
        border: destaque
          ? `1px solid ${CORES.vermelho}66`
          : PAINEL.border,
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <span className="text-light small">
            Pergunta {pergunta.index + 1}
            {total ? ` de ${total}` : ""}
          </span>

          <div className="d-flex flex-wrap align-items-center gap-3 small">
            <span className="text-light">
              ⏱️ {formatarTempo(pergunta.tempo_medio_ms ?? 0)} em média
            </span>

            <span className="text-light">
              {pergunta.acertos} de {pergunta.respondidas} acertaram
            </span>

            <span className="fw-bold" style={{ color: cor }}>
              {pergunta.aproveitamento}%
            </span>
          </div>
        </div>

        {destaque && (
          <span
            className="badge mb-2"
            style={{ background: "rgba(239,68,68,.25)", color: "#fff" }}
          >
            🚨 Foi a pergunta que mais derrubou a turma
          </span>
        )}

        <h5 className="text-white mb-3">{pergunta.enunciado}</h5>

        <div className="d-flex flex-column gap-2">
          {(pergunta.alternativas ?? []).map((alternativa, indice) => {
            const percentual = alternativa.percentual ?? 0;

            return (
              <div key={alternativa.id} className="alternativa-linha">
                <div
                  className="alternativa-preenchimento"
                  style={{
                    width: `${Math.max(0, Math.min(100, percentual))}%`,
                    background: alternativa.correta
                      ? "rgba(16,185,129,.28)"
                      : "rgba(239,68,68,.20)",
                  }}
                />

                <div className="alternativa-conteudo">
                  <span
                    className="fw-bold"
                    style={{
                      color: alternativa.correta ? CORES.verde : "#fff",
                      minWidth: "20px",
                    }}
                  >
                    {LETRAS[indice] ?? indice + 1}
                  </span>

                  <span className="text-white flex-grow-1">
                    {alternativa.texto}
                    {alternativa.correta && (
                      <span
                        className="ms-2 small"
                        style={{ color: CORES.verde }}
                      >
                        ✅ correta
                      </span>
                    )}
                  </span>

                  <span className="text-light small text-nowrap">
                    {alternativa.marcacoes} · {percentual}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CartaoPergunta;
