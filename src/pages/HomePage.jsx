import { Link } from "react-router-dom";
import UniverseBackground from "../components/UniverseBackground";

function HomePage() {
  return (
    <div className="container-fluid">

      {/* Cabeçalho */}
      <div className="mb-5">
        <h1 className="display-5 fw-bold text-white">
          Bem-vindo ao Universus 🚀
        </h1>

        <p className="text-light fs-5">
          Aprenda, desafie seus amigos e evolua seu personagem.
        </p>
      </div>

      {/* Ações rápidas */}
      <div className="row g-4">

        <div className="col-lg-4 col-md-6">
          <Link
            to="/dashboard/criar-quiz"
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
                <i className="fas fa-plus-circle fa-4x mb-4"></i>

                <h3>Criar Quiz</h3>

                <p>
                  Crie um novo jogo para sua turma.
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

              <h2>12</h2>

              <p>Quizzes Criados</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>57</h2>

              <p>Partidas Jogadas</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>8450</h2>

              <p>Pontos</p>

            </div>

          </div>

        </div>

        <div className="col-md-3">

          <div className="card bg-dark text-white border-0 shadow-lg">

            <div className="card-body text-center">

              <h2>Lv. 8</h2>

              <p>Nível</p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default HomePage;