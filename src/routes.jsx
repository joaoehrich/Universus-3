// src/routes.jsx

import { createBrowserRouter } from "react-router-dom";

import Layout from "./components/Layout";
import RotaProtegida from "./components/RotaProtegida";

// Autenticação
import LoginPage from "./pages/LoginPage";
import CriarContaPage from "./pages/CriarContaPage";
import AuthCallback from "./pages/AuthCallback";

// Dashboard
import HomePage from "./pages/HomePage";
import MeusJogosPage from "./pages/MeusJogosPage";
import CriarQuizPage from "./pages/CriarQuizPage";
import PesquisaPage from "./pages/PesquisaPage";
import ResultadosPage from "./pages/ResultadosPage";
import DetalhePartidaPage from "./pages/DetalhePartidaPage";
import TemasPage from "./pages/TemasPage";
import RankingPage from "./pages/RankingPage";
import SalasPage from "./pages/SalasPage";
import PerfilPage from "./pages/PerfilPage";
import PersonagemPage from "./pages/PersonagemPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import EntrarSalaPage from "./pages/EntrarSalaPage";

// Partida ao vivo
import SalaHostPage from "./pages/SalaHostPage";
import JogarPage from "./pages/JogarPage";

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
        element: (
          <RotaProtegida papel="professor">
            <MeusJogosPage />
          </RotaProtegida>
        ),
      },
      {
        path: "criar-quiz",
        element: (
          <RotaProtegida papel="professor">
            <CriarQuizPage />
          </RotaProtegida>
        ),
      },
      {
        path: "pesquisa",
        element: <PesquisaPage />,
      },
      {
        path: "resultados",
        element: <ResultadosPage />,
      },

      // Respostas de uma partida, pergunta a pergunta
      {
        path: "resultados/:salaId",
        element: <DetalhePartidaPage />,
      },
      {
        path: "temas",
        element: <TemasPage />,
      },
      {
        path: "ranking",
        element: <RankingPage />,
      },
      {
        path: "salas",
        element: (
          <RotaProtegida papel="professor">
            <SalasPage />
          </RotaProtegida>
        ),
      },
      {
        path: "entrar-sala",
        element: <EntrarSalaPage />,
      },

      // Painel do professor durante a partida
      {
        path: "sala/:codigo",
        element: (
          <RotaProtegida papel="professor">
            <SalaHostPage />
          </RotaProtegida>
        ),
      },

      // Tela do aluno durante a partida
      {
        path: "jogar/:codigo",
        element: <JogarPage />,
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