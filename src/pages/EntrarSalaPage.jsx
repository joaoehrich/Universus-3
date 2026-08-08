// src/pages/EntrarSalaPage.jsx
//
// Lado do aluno: digita o código que o professor projetou e cai no lobby.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { entrarSala } from "../lib/partida";

import "../styles/partida.css";

function EntrarSalaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [codigo, setCodigo] = useState(
    (searchParams.get("codigo") ?? "").toUpperCase()
  );
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  // Se o código veio pela URL, entra direto.
  useEffect(() => {
    const daUrl = searchParams.get("codigo");

    if (daUrl) entrar(daUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrar(valor) {
    const limpo = (valor ?? "").trim().toUpperCase();

    if (limpo.length < 4) {
      setErro("Digite o código completo da sala.");
      return;
    }

    try {
      setErro("");
      setEntrando(true);

      await entrarSala(limpo);

      navigate(`/dashboard/jogar/${limpo}`);
    } catch (err) {
      setErro(err.message);
      setEntrando(false);
    }
  }

  function enviar(e) {
    e.preventDefault();
    entrar(codigo);
  }

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="partida-painel-forte p-5 text-center">
            <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🎮</div>

            <h1 className="display-6 fw-bold text-white mt-3 mb-2">
              Entrar em Sala
            </h1>

            <p className="text-light mb-5">
              Digite o código que apareceu na tela do professor.
            </p>

            {erro && <div className="alert alert-danger">{erro}</div>}

            <form onSubmit={enviar} className="d-flex flex-column align-items-center gap-4">
              <input
                className="partida-campo-codigo"
                placeholder="CÓDIGO"
                value={codigo}
                maxLength={6}
                autoFocus
                autoComplete="off"
                onChange={(e) =>
                  setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
              />

              <button className="partida-botao px-5" disabled={entrando}>
                {entrando ? "Entrando..." : "🚀 Entrar na partida"}
              </button>
            </form>

            <p className="text-light small mt-5 mb-0">
              Ainda não tem código? Peça para o professor abrir uma sala em{" "}
              <strong>Salas</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntrarSalaPage;
