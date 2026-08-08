// src/pages/TemasPage.jsx
//
// Aproveitamento do aluno por tema, do pior para o melhor: o que precisa de
// estudo aparece primeiro.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";
import { meuDesempenhoPorTema } from "../lib/relatorios";

const PAINEL = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: "20px",
};

// Faixas de aproveitamento, para dar um nome ao numero.
function situacao(aproveitamento) {
  if (aproveitamento >= 80) return { texto: "Forte 💪", cor: "#10B981" };
  if (aproveitamento >= 50) return { texto: "Em progresso 📈", cor: "#F59E0B" };

  return { texto: "A treinar 📚", cor: "#EF4444" };
}

function TemasPage() {
  const { perfil } = usePerfil();

  const [temas, setTemas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        const dados = await meuDesempenhoPorTema(perfil.id);

        if (!ativo) return;

        setTemas(dados);
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

  return (
    <div className="container-fluid">
      <div className="mb-5">
        <h1 className="display-6 fw-bold text-white mb-1">Meus Temas 🎯</h1>

        <p className="text-light mb-0">
          Seu aproveitamento em cada assunto. O que precisa de estudo vem primeiro.
        </p>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregando ? (
        <p className="text-light">Calculando seu desempenho...</p>
      ) : temas.length === 0 ? (
        <div className="card border-0 text-center" style={PAINEL}>
          <div className="card-body py-5">
            <div style={{ fontSize: "3rem", lineHeight: 1 }}>🔭</div>

            <h4 className="text-white mt-3">Nenhum tema para mostrar ainda</h4>

            <p className="text-light">
              Depois da sua primeira partida, seu desempenho por tema aparece aqui.
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
        <div className="d-flex flex-column gap-3">
          {temas.map((tema) => {
            const marca = situacao(tema.aproveitamento);

            return (
              <div key={tema.tema} className="card border-0" style={PAINEL}>
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <h5 className="text-white mb-0">{tema.tema}</h5>

                    <div className="d-flex align-items-center gap-3">
                      <span className="text-light small">
                        {tema.acertos} de {tema.respondidas} perguntas
                      </span>

                      <span className="badge" style={{ background: marca.cor }}>
                        {marca.texto}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(255,255,255,.08)",
                      borderRadius: "999px",
                      height: "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${tema.aproveitamento}%`,
                        height: "100%",
                        background: marca.cor,
                        borderRadius: "999px",
                        transition: "width .4s ease",
                      }}
                    />
                  </div>

                  <p className="text-light small mb-0 mt-2">
                    {tema.aproveitamento}% de aproveitamento
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TemasPage;
