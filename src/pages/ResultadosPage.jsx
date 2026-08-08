// src/pages/ResultadosPage.jsx
//
// Meus Resultados: o historico de partidas do aluno, com o caminho para o
// detalhe pergunta a pergunta de cada uma.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";
import {
  formatarData,
  meuHistorico,
  resumoDoHistorico,
} from "../lib/relatorios";

const PAINEL = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "20px",
};

function Metrica({ valor, rotulo, cor }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card border-0 h-100" style={PAINEL}>
        <div className="card-body text-center">
          <h2 className="mb-1" style={{ color: cor }}>
            {valor}
          </h2>

          <p className="text-light mb-0 small">{rotulo}</p>
        </div>
      </div>
    </div>
  );
}

function ResultadosPage() {
  const { perfil } = usePerfil();

  const [historico, setHistorico] = useState([]);
  const [tema, setTema] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        const dados = await meuHistorico(perfil.id);

        if (!ativo) return;

        setHistorico(dados);
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
  }, [perfil]);

  const resumo = resumoDoHistorico(historico);

  const temas = [
    ...new Set(
      historico.map((partida) => partida.salas?.quizzes?.category).filter(Boolean)
    ),
  ];

  const visiveis = tema
    ? historico.filter((partida) => partida.salas?.quizzes?.category === tema)
    : historico;

  return (
    <div className="container-fluid">
      <div className="mb-5">
        <h1 className="display-6 fw-bold text-white mb-1">Meus Resultados 📊</h1>

        <p className="text-light mb-0">
          Todas as partidas que você jogou, com acertos, pontos e colocação.
        </p>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregando ? (
        <p className="text-light">Carregando seus resultados...</p>
      ) : historico.length === 0 ? (
        <div className="card border-0 text-center" style={PAINEL}>
          <div className="card-body py-5">
            <div style={{ fontSize: "3rem", lineHeight: 1 }}>🛸</div>

            <h4 className="text-white mt-3">Você ainda não jogou nenhuma partida</h4>

            <p className="text-light">
              Peça o código de uma sala ao seu professor para começar.
            </p>

            <Link
              to="/dashboard/entrar-sala"
              className="btn"
              style={{ background: "#7C3AED", color: "#fff", border: "none" }}
            >
              🎮 Entrar em Sala
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Resumo geral */}
          <div className="row g-4 mb-5">
            <Metrica valor={resumo.partidas} rotulo="Partidas jogadas" cor="#A78BFA" />

            <Metrica
              valor={
                resumo.aproveitamento === null ? "–" : `${resumo.aproveitamento}%`
              }
              rotulo="Aproveitamento"
              cor="#10B981"
            />

            <Metrica
              valor={`🔥 ${resumo.melhorStreak}`}
              rotulo="Melhor sequência"
              cor="#F59E0B"
            />

            <Metrica valor={resumo.pontos} rotulo="Pontos totais" cor="#2563EB" />
          </div>

          {/* Filtro por tema */}
          {temas.length > 1 && (
            <div className="d-flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                className={`btn btn-sm ${
                  tema ? "btn-outline-light" : "btn-light"
                }`}
                onClick={() => setTema("")}
              >
                Todos
              </button>

              {temas.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`btn btn-sm ${
                    tema === item ? "btn-light" : "btn-outline-light"
                  }`}
                  onClick={() => setTema(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Histórico */}
          <div className="card border-0" style={PAINEL}>
            <div className="card-body p-0 table-responsive">
              <table className="table table-dark table-borderless mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Quiz</th>
                    <th>Tema</th>
                    <th className="text-end">Acertos</th>
                    <th className="text-end">Pontos</th>
                    <th className="text-end">Colocação</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {visiveis.map((partida) => {
                    const encerrada = partida.salas?.estado === "encerrada";

                    return (
                      <tr key={partida.id}>
                        <td className="text-light">
                          {formatarData(partida.entrou_em)}
                        </td>

                        <td className="text-white">
                          {partida.salas?.quizzes?.title ?? "Quiz"}
                        </td>

                        <td className="text-light">
                          {partida.salas?.quizzes?.category ?? "-"}
                        </td>

                        <td className="text-end text-light">
                          {partida.acertos}/{partida.salas?.total_perguntas ?? 0}
                        </td>

                        <td className="text-end fw-bold text-white">
                          {partida.pontos}
                        </td>

                        <td className="text-end text-light">
                          {encerrada
                            ? `${partida.colocacao}º de ${partida.participantes}`
                            : "—"}
                        </td>

                        <td className="text-end">
                          {encerrada ? (
                            <Link
                              to={`/dashboard/resultados/${partida.sala_id}`}
                              className="btn btn-sm btn-outline-light"
                            >
                              Ver respostas
                            </Link>
                          ) : (
                            <span className="badge bg-secondary">
                              Em andamento
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ResultadosPage;
