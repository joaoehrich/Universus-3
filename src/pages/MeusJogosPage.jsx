// src/pages/MeusJogosPage.jsx

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";

function MeusJogosPage() {
  const { perfil } = usePerfil();

  const [quizzes, setQuizzes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(async () => {
    if (!perfil) return;

    try {
      setErro("");
      setCarregando(true);

      const { data, error } = await supabase
        .from("quizzes")
        .select(
          "id, title, description, category, difficulty, qtd_perguntas, access_code, visibilidade, created_at"
        )
        .eq("creator_id", perfil.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setQuizzes(data ?? []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [perfil]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternarVisibilidade(quiz) {
    const novo = quiz.visibilidade === "publico" ? "privado" : "publico";

    const { error } = await supabase
      .from("quizzes")
      .update({ visibilidade: novo })
      .eq("id", quiz.id);

    if (error) {
      setErro(error.message);
      return;
    }

    setQuizzes((lista) =>
      lista.map((item) =>
        item.id === quiz.id ? { ...item, visibilidade: novo } : item
      )
    );
  }

  async function excluir(quiz) {
    if (!window.confirm(`Excluir o quiz "${quiz.title}"?`)) return;

    try {
      setExcluindo(quiz.id);

      const { error } = await supabase.rpc("excluir_quiz", {
        p_quiz: quiz.id,
      });

      if (error) throw error;

      setQuizzes((lista) => lista.filter((item) => item.id !== quiz.id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="display-6 fw-bold text-white mb-1">
            Meus Jogos 🎯
          </h1>

          <p className="text-light mb-0">
            Os quizzes que você criou ficam salvos aqui.
          </p>
        </div>

        <Link
          to="/dashboard/criar-quiz"
          className="btn btn-lg"
          style={{ background: "#7C3AED", color: "#fff", border: "none" }}
        >
          ➕ Criar Quiz
        </Link>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregando ? (
        <p className="text-light">Carregando seus quizzes...</p>
      ) : quizzes.length === 0 ? (
        <div
          className="card border-0 text-center"
          style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: "20px",
          }}
        >
          <div className="card-body py-5">
            <h4 className="text-white">Nenhum quiz criado ainda</h4>

            <p className="text-light mb-0">
              Crie seu primeiro quiz e ele aparecerá aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="col-lg-4 col-md-6">
              <div
                className="card border-0 h-100"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: "20px",
                }}
              >
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h4 className="text-white mb-0">{quiz.title}</h4>

                    <span
                      className="badge"
                      style={{
                        background:
                          quiz.visibilidade === "publico"
                            ? "rgba(34,197,94,.25)"
                            : "rgba(255,255,255,.12)",
                        color: "#fff",
                      }}
                    >
                      {quiz.visibilidade === "publico"
                        ? "Público"
                        : "Privado"}
                    </span>
                  </div>

                  {quiz.description && (
                    <p className="text-light small mb-3">
                      {quiz.description}
                    </p>
                  )}

                  <p className="text-light mb-1">
                    📚 {quiz.category} · {quiz.difficulty}
                  </p>

                  <p className="text-light mb-1">
                    ❓ {quiz.qtd_perguntas ?? 0} perguntas
                  </p>

                  <p className="text-light mb-4">
                    🔑 Código: <strong>{quiz.access_code}</strong>
                  </p>

                  <div className="mt-auto d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light flex-grow-1"
                      onClick={() => alternarVisibilidade(quiz)}
                    >
                      {quiz.visibilidade === "publico"
                        ? "Tornar privado"
                        : "Tornar público"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => excluir(quiz)}
                      disabled={excluindo === quiz.id}
                    >
                      {excluindo === quiz.id ? "..." : "Excluir"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MeusJogosPage;
