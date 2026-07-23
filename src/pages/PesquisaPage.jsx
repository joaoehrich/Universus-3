import React, { useState, useEffect } from "react";
import UniverseBackground from "../components/UniverseBackground";

function PesquisaPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulação de dados — substitua pela chamada real à API
    const data = [
      { id: 1, titulo: "Quiz de História", descricao: "Descubra fatos históricos incríveis!", cor: "#7C3AED" },
      { id: 2, titulo: "Quiz de Matemática", descricao: "Desafie-se com números e lógica!", cor: "#2563EB" },
      { id: 3, titulo: "Quiz de Filmes", descricao: "Você é cinéfilo? Prove!", cor: "#EC4899" },
      { id: 4, titulo: "Quiz de Ciências", descricao: "Explore o universo do conhecimento!", cor: "#10B981" },
    ];
    setQuizzes(data);
  }, []);

  const filteredQuizzes = quizzes.filter((quiz) =>
    quiz.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid position-relative">
      <UniverseBackground />

      {/* Cabeçalho */}
      <div className="mb-5 text-center">
        <h1 className="display-5 fw-bold text-white">Pesquisar Quizzes 🔍</h1>
        <p className="text-light fs-5">
          Encontre quizzes criados por outros jogadores e desafie seus amigos!
        </p>
      </div>

      {/* Campo de pesquisa */}
      <div className="mb-4 text-center">
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
      </div>

      {/* Listagem de quizzes */}
      <div className="row g-4">
        {filteredQuizzes.length > 0 ? (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="col-lg-4 col-md-6">
              <div
                className="card border-0 shadow-lg h-100"
                style={{
                  background: quiz.cor,
                  color: "#fff",
                  borderRadius: "20px",
                }}
              >
                <div className="card-body text-center py-5">
                  <i className="fas fa-question-circle fa-4x mb-4"></i>
                  <h3>{quiz.titulo}</h3>
                  <p>{quiz.descricao}</p>
                  <button
                    className="btn btn-light mt-3"
                    style={{ borderRadius: "20px" }}
                  >
                    Jogar Quiz
                  </button>
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
    </div>
  );
}

export default PesquisaPage;
