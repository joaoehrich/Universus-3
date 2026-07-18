// src/routes.jsx

import { createBrowserRouter } from "react-router-dom";

import Layout from "./components/Layout";

// Autenticação
import LoginPage from "./pages/LoginPage";
import CriarContaPage from "./pages/CriarContaPage";
import AuthCallback from "./pages/AuthCallback";

// Dashboard
import HomePage from "./pages/HomePage";
import MeusJogosPage from "./pages/MeusJogosPage";
import CriarQuizPage from "./pages/CriarQuizPage";
import BibliotecaPage from "./pages/BibliotecaPage";
import ResultadosPage from "./pages/ResultadosPage";
import RankingPage from "./pages/RankingPage";
import SalasPage from "./pages/SalasPage";
import PerfilPage from "./pages/PerfilPage";
import PersonagemPage from "./pages/PersonagemPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EntrarSalaPage from "./pages/EntrarSalaPage";

export const router = createBrowserRouter([
  // Login
  {
    path: "/",
    element: <LoginPage />,
  },

  // Cadastro
  {
    path: "/criar-conta",
    element: <CriarContaPage />,
  },

  // Callback do Google OAuth
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },

  // Dashboard
  {
    path: "/dashboard",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "jogos",
        element: <MeusJogosPage />,
      },
      {
        path: "criar-quiz",
        element: <CriarQuizPage />,
      },
      {
        path: "biblioteca",
        element: <BibliotecaPage />,
      },
      {
        path: "resultados",
        element: <ResultadosPage />,
      },
      {
        path: "ranking",
        element: <RankingPage />,
      },
      {
        path: "salas",
        element: <SalasPage />,
      },
      {
        path: "entrar-sala",
        element: <EntrarSalaPage />,
      },
      {
        path: "personagem",
        element: <PersonagemPage />,
      },
      {
        path: "perfil",
        element: <PerfilPage />,
      },
      {
        path: "configuracoes",
        element: <ConfiguracoesPage />,
      },
    ],
  },
]);