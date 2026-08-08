// src/pages/SalasPage.jsx
//
// Lado do professor: escolhe um quiz e abre a sala da partida ao vivo.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";
import { criarSala } from "../lib/partida";

import "../styles/partida.css";

const ESTADOS = {
  lobby: { texto: "No lobby", cor: "rgba(37,99,235,.3)" },
  pergunta: { texto: "Em andamento", cor: "rgba(16,185,129,.3)" },
  revelacao: { texto: "Em andamento", cor: "rgba(16,185,129,.3)" },
};

function SalasPage() {
  const navigate = useNavigate();
  const { perfil } = usePerfil();

  const [quizzes, setQuizzes] = useState([]);
  const [salasAbertas, setSalasAbertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        const [meusQuizzes, minhasSalas] = await Promise.all([
          supabase
            .from("quizzes")
            .select("id, title, category, difficulty, qtd_perguntas, time_per_question")
            .eq("creator_id", perfil.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("salas")
            .select("id, codigo, estado, total_perguntas, created_at, quizzes(title)")
            .eq("host_id", perfil.id)
            .neq("estado", "encerrada")
            .order("created_at", { ascending: false }),
        ]);

        if (meusQuizzes.error) throw meusQuizzes.error;
        if (minhasSalas.error) throw minhasSalas.error;
        if (!ativo) return;

        setQuizzes(meusQuizzes.data ?? []);
        setSalasAbertas(minhasSalas.data ?? []);
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

  async function abrirSala(quiz) {
    try {
      setErro("");
      setAbrindo(quiz.id);

      const sala = await criarSala(quiz.id);

      navigate(`/dashboard/sala/${sala.codigo}`);
    } catch (err) {
      setErro(err.message);
      setAbrindo(null);
    }
  }

  return (
    <div className="container-fluid">
      <div className="mb-5">
        <h1 className="display-6 fw-bold text-white mb-1">Salas 🎮</h1>

        <p className="text-light mb-0">
          Abra uma sala e projete o código para a turma entrar na partida.
        </p>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {/* Salas que ainda estão de pé, para o professor voltar ao controle */}
      {salasAbertas.length > 0 && (
        <div className="partida-painel p-4 mb-5">
          <h4 className="mb-3">Salas abertas</h4>

          <div className="d-flex flex-column gap-2">
            {salasAbertas.map((sala) => (
              <div
                key={sala.id}
                className="d-flex flex-wrap align-items-center gap-3 p-3"
                style={{ background: "rgba(255,255,255,.04)", borderRadius: "14px" }}
              >
                <span
                  className="fw-bold"
                  style={{ fontSize: "1.3rem", letterSpacing: ".15em", color: "#A78BFA" }}
                >
                  {sala.codigo}
                </span>

                <span className="text-white flex-grow-1">
                  {sala.quizzes?.title ?? "Quiz"}
                </span>

                <span
                  className="badge"
                  style={{
                    background: ESTADOS[sala.estado]?.cor ?? "rgba(255,255,255,.12)",
                    color: "#fff",
                  }}
                >
                  {ESTADOS[sala.estado]?.texto ?? sala.estado}
                </span>

                <button
                  className="partida-botao"
                  style={{ padding: "8px 18px" }}
                  onClick={() => navigate(`/dashboard/sala/${sala.codigo}`)}
                >
                  Voltar ao controle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h4 className="mb-3">Meus quizzes</h4>

      {carregando ? (
        <p className="text-light">Carregando...</p>
      ) : quizzes.length === 0 ? (
        <div className="partida-painel p-5 text-center">
          <i className="fas fa-ghost fa-3x mb-3" style={{ color: "#7C3AED" }}></i>

          <h4>Você ainda não criou nenhum quiz</h4>

          <p className="text-light">
            Crie um quiz primeiro e depois volte aqui para abrir a sala.
          </p>

          <button
            className="partida-botao"
            onClick={() => navigate("/dashboard/criar-quiz")}
          >
            Criar Quiz
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="col-lg-4 col-md-6">
              <div className="partida-painel h-100 p-4 d-flex flex-column">
                <h4 className="text-white mb-2">{quiz.title}</h4>

                <p className="text-light mb-1">
                  📚 {quiz.category} · {quiz.difficulty}
                </p>

                <p className="text-light mb-1">
                  ❓ {quiz.qtd_perguntas ?? 0} perguntas
                </p>

                <p className="text-light mb-4">
                  ⏱️ {quiz.time_per_question ?? 30}s por pergunta
                </p>

                <button
                  className="partida-botao mt-auto"
                  disabled={abrindo === quiz.id}
                  onClick={() => abrirSala(quiz)}
                >
                  {abrindo === quiz.id ? "Abrindo..." : "🚀 Abrir sala"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalasPage;
