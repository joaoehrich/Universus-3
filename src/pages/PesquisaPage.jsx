// src/pages/PesquisaPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";
import { criarSala } from "../lib/partida";

// Cores usadas só para dar identidade visual aos cards.
const CORES = ["#7C3AED", "#2563EB", "#EC4899", "#10B981", "#F59E0B"];

function PesquisaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { perfil } = usePerfil();

  // Quem abre a sala e o professor. O aluno entra pelo codigo.
  const ehProfessor = perfil?.role === "professor";

  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(null);
  const [erro, setErro] = useState("");

  const termo = searchParams.get("q") ?? "";

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setErro("");
        setCarregando(true);

        let consulta = supabase
          .from("quizzes")
          .select(
            "id, title, description, category, difficulty, qtd_perguntas, access_code, profiles(name)"
          )
          .eq("visibilidade", "publico")
          .order("created_at", { ascending: false })
          .limit(60);

        if (termo) {
          consulta = consulta.ilike("title", `%${termo}%`);
        }

        const { data, error } = await consulta;

        if (error) throw error;
        if (!ativo) return;

        setQuizzes(data ?? []);
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
  }, [termo]);

  function pesquisar(e) {
    e.preventDefault();

    setSearchParams(searchTerm.trim() ? { q: searchTerm.trim() } : {});
  }

  // Abre uma sala ao vivo desse quiz e leva quem clicou para o controle.
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
    <div className="container-fluid position-relative">
      {/* Cabeçalho */}
      <div className="mb-5 text-center">
        <h1 className="display-5 fw-bold text-white">Pesquisar Quizzes 🔍</h1>
        <p className="text-light fs-5">
          Encontre quizzes públicos criados por outros jogadores e desafie seus
          amigos!
        </p>
      </div>

      {/* Campo de pesquisa */}
      <form className="mb-4 text-center" onSubmit={pesquisar}>
        <input
          type="text"
          className="form-control w-50 mx-auto"
          placeholder="Digite o nome do quiz..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            borderRadius: "20px",
            padding: "10px 20px",
            fontSize: "1.1rem",
          }}
        />
      </form>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {/* Listagem de quizzes */}
      {carregando ? (
        <p className="text-center text-light">Buscando quizzes...</p>
      ) : (
        <div className="row g-4">
          {quizzes.length > 0 ? (
            quizzes.map((quiz, indice) => (
              <div key={quiz.id} className="col-lg-4 col-md-6">
                <div
                  className="card border-0 shadow-lg h-100"
                  style={{
                    background: CORES[indice % CORES.length],
                    color: "#fff",
                    borderRadius: "20px",
                  }}
                >
                  <div className="card-body text-center py-5">
                    <i className="fas fa-question-circle fa-4x mb-4"></i>

                    <h3>{quiz.title}</h3>

                    <p className="mb-1">
                      {quiz.description || `Quiz de ${quiz.category}`}
                    </p>

                    <p className="small mb-1">
                      {quiz.qtd_perguntas ?? 0} perguntas · {quiz.difficulty}
                    </p>

                    {quiz.profiles?.name && (
                      <p className="small mb-0">por {quiz.profiles.name}</p>
                    )}

                    {ehProfessor ? (
                      <button
                        className="btn btn-light mt-3"
                        style={{ borderRadius: "20px" }}
                        disabled={abrindo === quiz.id}
                        onClick={() => abrirSala(quiz)}
                      >
                        {abrindo === quiz.id
                          ? "Abrindo sala..."
                          : "🚀 Abrir sala"}
                      </button>
                    ) : (
                      <p className="small mb-0 mt-3 opacity-75">
                        Peça o código ao seu professor para jogar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-light">
              <p>Nenhum quiz encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PesquisaPage;
