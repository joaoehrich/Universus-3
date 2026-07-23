// src/components/Sidebar.jsx

import { Link, NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" to="/dashboard">
        <span className="sidebar-brand-icon">🌌</span>
        <span className="sidebar-brand-text">Universus</span>
      </Link>

      <nav className="sidebar-menu">
        <NavLink to="/dashboard" end className="sidebar-link">
          <i className="fas fa-home"></i>
          <span>Início</span>
        </NavLink>

        <NavLink to="/dashboard/jogos" className="sidebar-link">
          <i className="fas fa-gamepad"></i>
          <span>Meus Jogos</span>
        </NavLink>

        <NavLink to="/dashboard/criar-quiz" className="sidebar-link">
          <i className="fas fa-plus-circle"></i>
          <span>Criar Quiz</span>
        </NavLink>

        <NavLink to="/dashboard/pesquisa" className="sidebar-link">
          <i className="fas fa-book"></i>
          <span>Pesquisa</span>
        </NavLink>

        <NavLink to="/dashboard/resultados" className="sidebar-link">
          <i className="fas fa-chart-line"></i>
          <span>Resultados</span>
        </NavLink>

        <NavLink to="/dashboard/ranking" className="sidebar-link">
          <i className="fas fa-trophy"></i>
          <span>Ranking</span>
        </NavLink>

        <NavLink to="/dashboard/salas" className="sidebar-link">
          <i className="fas fa-users"></i>
          <span>Salas</span>
        </NavLink>

        <NavLink to="/dashboard/personagem" className="sidebar-link">
          <i className="fas fa-user-astronaut"></i>
          <span>Meu Personagem</span>
        </NavLink>

        <NavLink to="/dashboard/configuracoes" className="sidebar-link">
          <i className="fas fa-cog"></i>
          <span>Configurações</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;