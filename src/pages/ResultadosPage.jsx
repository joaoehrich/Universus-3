// src/pages/ResultadosPage.jsx
//
// A mesma rota atende dois publicos: o aluno ve o proprio historico, o
// professor ve o painel da turma. Aqui so decidimos qual painel montar.

import { usePerfil } from "../hooks/usePerfil";
import ResultadosAluno from "../components/resultados/ResultadosAluno";
import ResultadosProfessor from "../components/resultados/ResultadosProfessor";
import "../styles/relatorios.css";

function ResultadosPage() {
  const { perfil, carregando, erro } = usePerfil();

  const ehProfessor = perfil?.role === "professor";

  if (carregando) {
    return <p className="text-light">Carregando...</p>;
  }

  if (erro) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{erro}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="display-6 fw-bold text-white mb-1">
          {ehProfessor ? "Resultados da Turma 🧑‍🏫" : "Meus Resultados 📊"}
        </h1>

        <p className="text-light mb-0">
          {ehProfessor
            ? "O que suas salas produziram: participação, acertos e onde a turma trava."
            : "Todas as partidas que você jogou, com acertos, pontos e colocação."}
        </p>
      </div>

      {ehProfessor ? (
        <ResultadosProfessor />
      ) : (
        <ResultadosAluno perfil={perfil} />
      )}
    </div>
  );
}

export default ResultadosPage;
