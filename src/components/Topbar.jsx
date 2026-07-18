// src/components/Topbar.jsx

import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Topbar.css";

function Topbar({ onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <input
          type="text"
          placeholder="Pesquisar quizzes..."
        />
      </div>

      <div className="topbar-right">
        <Link
          to="/dashboard/entrar-sala"
          className="enter-room-btn"
        >
          🎮 Entrar em Sala
        </Link>

        <div className="profile">
          <button
            className="profile-button"
            onClick={() => setOpen(!open)}
          >
            <img
              src="https://ui-avatars.com/api/?name=Universus&background=7B2FF7&color=fff"
              alt="avatar"
            />

            <span>Jogador</span>

            <i className="fas fa-chevron-down"></i>
          </button>

          {open && (
            <div className="profile-menu">
              <Link to="/dashboard/perfil">
                👤 Meu Perfil
              </Link>

              <Link to="/dashboard/personagem">
                🚀 Meu Personagem
              </Link>

              <Link to="/dashboard/configuracoes">
                ⚙️ Configurações
              </Link>

              <hr />

              <button onClick={onLogout}>
                🚪 Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;