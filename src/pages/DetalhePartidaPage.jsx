// src/pages/DetalhePartidaPage.jsx
//
// O aluno reve, pergunta a pergunta, o que marcou naquela partida: se
// acertou, qual era a resposta certa, quanto tempo levou e a explicacao.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";
import {
  formatarData,
  formatarTempo,
  meuDetalhePartida,
} from "../lib/relatorios";

const PAINEL = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "20px",
};

function DetalhePartidaPage() {
  const { salaId } = useParams();
  const { perfil } = usePerfil();

  const [detalhe, setDetalhe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        const dados = await meuDetalhePartida(salaId, perfil.id);

        if (!ativo) return;

        setDetalhe(dados);
        setErro("");
      } catch (err) {
        if (ativo) setErro(err.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [salaId, perfil]);

  if (carregando) {
    return <p className="text-light">Carregando suas respostas...</p>;
  }

  if (erro || !detalhe) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          {erro || "Partida não encontrada."}
        </div>

        <Link to="/dashboard/resultados" className="btn btn-outline-light">
          ← Voltar aos resultados
        </Link>
      </div>
    );
  }

  const { sala, jogador, perguntas } = detalhe;

  return (
    <div className="container-fluid">
      <Link
        to="/dashboard/resultados"
        className="btn btn-sm btn-outline-light mb-4"
      >
        ← Voltar aos resultados
      </Link>

      <div className="mb-4">
        <h1 className="display-6 fw-bold text-white mb-1">
          {sala.quizzes?.title ?? "Partida"}
        </h1>

        <p className="text-light mb-0">
          {sala.quizzes?.category} · sala <strong>{sala.codigo}</strong> ·{" "}
          {formatarData(sala.created_at)}
        </p>
      </div>

      {/* Resumo da partida */}
      <div className="row g-4 mb-5">
        <div className="col-4">
          <div className="card border-0 h-100" style={PAINEL}>
            <div className="card-body text-center">
              <h2 className="mb-1" style={{ color: "#7C3AED" }}>
                {jogador.pontos}
              </h2>

              <p className="text-light mb-0 small">pontos</p>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card border-0 h-100" style={PAINEL}>
            <div className="card-body text-center">
              <h2 className="mb-1" style={{ color: "#10B981" }}>
                {jogador.acertos}/{sala.total_perguntas}
              </h2>

              <p className="text-light mb-0 small">acertos</p>
            </div>
          </div>
        </div>

        <div className="col-4">
          <div className="card border-0 h-100" style={PAINEL}>
            <div className="card-body text-center">
              <h2 className="mb-1" style={{ color: "#F59E0B" }}>
                🔥 {jogador.melhor_streak}
              </h2>

              <p className="text-light mb-0 small">melhor sequência</p>
            </div>
          </div>
        </div>
      </div>

      <h4 className="text-white mb-3">Suas respostas</h4>

      {perguntas.length === 0 ? (
        <div className="card border-0" style={PAINEL}>
          <div className="card-body text-center py-5">
            <p className="text-light mb-0">
              Você não chegou a responder nenhuma pergunta nessa partida.
            </p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {perguntas.map((pergunta) => (
            <div
              key={pergunta.indice}
              className="card border-0"
              style={{
                ...PAINEL,
                border: `1px solid ${
                  pergunta.acertou ? "rgba(16,185,129,.5)" : "rgba(239,68,68,.4)"
                }`,
              }}
            >
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <span className="text-light small">
                    Pergunta {pergunta.indice + 1} de {sala.total_perguntas}
                  </span>

                  <div className="d-flex align-items-center gap-3">
                    <span className="text-light small">
                      ⏱️ {formatarTempo(pergunta.tempoMs)}
                    </span>

                    <span
                      className="fw-bold"
                      style={{
                        color: pergunta.acertou
                          ? "#10B981"
                          : "rgba(255,255,255,.35)",
                      }}
                    >
                      +{pergunta.pontos}
                    </span>
                  </div>
                </div>

                <h5 className="text-white mb-4">{pergunta.enunciado}</h5>

                {/* O que o aluno marcou */}
                <div className="mb-2">
                  <span className="text-light small d-block mb-1">
                    Sua resposta
                  </span>

                  <div
                    className="p-3"
                    style={{
                      background: pergunta.acertou
                        ? "rgba(16,185,129,.15)"
                        : "rgba(239,68,68,.12)",
                      borderRadius: "12px",
                    }}
                  >
                    <span className="text-white">
                      {pergunta.acertou ? "✅ " : "❌ "}
                      {pergunta.minha?.texto ?? "Não respondeu (tempo esgotado)"}
                    </span>
                  </div>
                </div>

                {/* Gabarito, só quando errou */}
                {!pergunta.acertou && pergunta.gabarito && (
                  <div className="mb-2">
                    <span className="text-light small d-block mb-1">
                      Resposta correta
                    </span>

                    <div
                      className="p-3"
                      style={{
                        background: "rgba(16,185,129,.15)",
                        borderRadius: "12px",
                      }}
                    >
                      <span className="text-white">
                        ✅ {pergunta.gabarito.texto}
                      </span>
                    </div>
                  </div>
                )}

                {pergunta.explicacao && (
                  <p className="text-light small mb-0 mt-3">
                    💡 {pergunta.explicacao}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DetalhePartidaPage;
