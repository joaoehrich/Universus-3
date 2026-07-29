// src/pages/RankingPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";

const MEDALHAS = ["🥇", "🥈", "🥉"];

function RankingPage() {
  const { perfil } = usePerfil();

  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setErro("");

        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, xp, nivel")
          .order("xp", { ascending: false })
          .order("name", { ascending: true })
          .limit(50);

        if (error) throw error;
        if (!ativo) return;

        setJogadores(data ?? []);
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
  }, []);

  return (
    <div className="container-fluid">
      <div className="mb-5">
        <h1 className="display-6 fw-bold text-white mb-1">Ranking 🏆</h1>

        <p className="text-light mb-0">
          Os exploradores com mais XP no Universus.
        </p>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregando ? (
        <p className="text-light">Carregando ranking...</p>
      ) : (
        <div
          className="card border-0"
          style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: "20px",
          }}
        >
          <div className="card-body p-0">
            <table className="table table-dark table-borderless mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>#</th>
                  <th>Jogador</th>
                  <th className="text-end">Nível</th>
                  <th className="text-end">XP</th>
                </tr>
              </thead>

              <tbody>
                {jogadores.map((jogador, indice) => (
                  <tr
                    key={jogador.id}
                    style={{
                      background:
                        jogador.id === perfil?.id
                          ? "rgba(124,58,237,.25)"
                          : "transparent",
                    }}
                  >
                    <td>{MEDALHAS[indice] ?? indice + 1}</td>
                    <td>{jogador.name}</td>
                    <td className="text-end">{jogador.nivel}</td>
                    <td className="text-end">{jogador.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default RankingPage;
