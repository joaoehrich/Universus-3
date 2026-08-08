// src/components/RotaProtegida.jsx
//
// Esconde do aluno as telas que sao do professor (criar quiz, abrir sala,
// controlar a partida). Quem digitar a URL na mao volta para o inicio em
// vez de ver uma tela quebrada ou um erro de permissao do banco.

import { Navigate } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";

function RotaProtegida({ papel, children }) {
  const { perfil, carregando } = usePerfil();

  // Enquanto o perfil carrega nao decide nada, senao o professor pisca
  // fora da propria tela.
  if (carregando) {
    return <p className="text-light">Carregando...</p>;
  }

  if (perfil?.role !== papel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RotaProtegida;
