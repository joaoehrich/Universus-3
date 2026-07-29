// src/components/Topbar.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Topbar.css";

function Topbar({ onLogout, perfil }) {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const nome = perfil?.name ?? "Jogador";

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nome
  )}&background=7B2FF7&color=fff`;

  function pesquisar(e) {
    e.preventDefault();

    navigate(`/dashboard/pesquisa?q=${encodeURIComponent(busca.trim())}`);
  }

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={pesquisar}>
        <input
          type="text"
          placeholder="Pesquisar quizzes..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </form>

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
            <img src={avatar} alt="avatar" />

            <span>{nome}</span>

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
