import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";

function HomePage() {
  const { perfil } = usePerfil();

  const ehProfessor = perfil?.role === "professor";

  const [estatisticas, setEstatisticas] = useState({
    quizzes: 0,
    partidas: 0,
    pontos: 0,
    aproveitamento: null,
  });

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      const [quizzes, partidas, tentativas] = await Promise.all([
        supabase
          .from("quizzes")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", perfil.id),

        supabase
          .from("quiz_attempts")
          .select("id", { count: "exact", head: true })
          .eq("student_id", perfil.id),

        supabase
          .from("quiz_attempts")
          .select("score, correct_answers, total_questions")
          .eq("student_id", perfil.id),
      ]);

      if (!ativo) return;

      const historico = tentativas.data ?? [];

      // Aproveitamento geral: acertos sobre perguntas respondidas em todas
      // as partidas. Sem partida nenhuma fica null, para a tela mostrar "-".
      const acertos = historico.reduce(
        (total, item) => total + (item.correct_answers ?? 0),
        0
      );

      const questoes = historico.reduce(
        (total, item) => total + (item.total_questions ?? 0),
        0
      );

      setEstatisticas({
        quizzes: quizzes.count ?? 0,
        partidas: partidas.count ?? 0,
        pontos: historico.reduce(
          (total, item) => total + (item.score ?? 0),
          0
        ),
        aproveitamento: questoes > 0 ? Math.round((acertos / questoes) * 100) : null,
      });
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [perfil]);

  return (
    <div className="container-fluid">

      {/* Cabeçalho */}
      <div className="mb-5">
        <h1 className="display-5 fw-bold text-white">
          Bem-vindo ao Universus, {perfil?.name ?? "explorador"} 🚀
        </h1>

        <p className="text-light fs-5">
          Aprenda, desafie seus amigos e evolua seu personagem.
        </p>
      </div>

      {/* Ações rápidas */}
      <div className="row g-4">

        <div className="col-lg-4 col-md-6">
          <Link
            to={ehProfessor ? "/dashboard/criar-quiz" : "/dashboard/resultados"}
            className="text-decoration-none"
          >
            <div
              className="card border-0 shadow-lg h-100"
              style={{
                background: "#7C3AED",
                color: "#fff",
                borderRadius: "20px",
              }}
            >
              <div className="card-body text-center py-5">
                <i
                  className={`fas ${
                    ehProfessor ? "fa-plus-circle" : "fa-chart-line"
                  } fa-4x mb-4`}
                ></i>

                <h3>{ehProfessor ? "Criar Quiz" : "Meus Resultados"}</h3>

                <p>
                  {ehProfessor
                    ? "Crie um novo jogo para sua turma."
                    : "Veja suas partidas, acertos e evolução."}
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-lg-4 col-md-6">
          <Link
            to="/dashboard/entrar-sala"
            className="text-decoration-none"
          >
            <div
              className="card border-0 shadow-lg h-100"
              style={{
                background: "#2563EB",
                color: "#fff",
                borderRadius: "20px",
              }}
            >
              <div className="card-body text-center py-5">
                <i className="fas fa-gamepad fa-4x mb-4"></i>

                <h3>Entrar em Sala</h3>

                <p>
                  Digite um código e participe de um quiz.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="col-lg-4 col-md-6">
          <Link
            to="/dashboard/personagem"
            className="text-decoration-none"
          >
            <div
              className="card border-0 shadow-lg h-100"
              style={{
                background: "#EC4899",
                color: "#fff",
                borderRadius: "20px",
              }}
            >
              <div className="card-body text-center py-5">
                <i className="fas fa-user-astronaut fa-4x mb-4"></i>

                <h3>Meu Personagem</h3>

                <p>
                  Personalize seu avatar espacial.
                </p>
              </div>
            </div>
          </Link>
        </div>

      </div>

      {/* Estatísticas */}

      <div className="row mt-5 g-4">

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>
                {ehProfessor
                  ? estatisticas.quizzes
                  : estatisticas.aproveitamento === null
                  ? "–"
                  : `${estatisticas.aproveitamento}%`}
              </h2>

              <p>{ehProfessor ? "Quizzes Criados" : "Aproveitamento"}</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>{estatisticas.partidas}</h2>

              <p>Partidas Jogadas</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>{estatisticas.pontos}</h2>

              <p>Pontos</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>Lv. {perfil?.nivel ?? 1}</h2>

              <p>Nível</p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default HomePage;