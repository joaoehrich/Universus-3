// src/pages/PersonagemPage.jsx

import { useState } from "react";

function PersonagemPage() {
  const [character, setCharacter] = useState({
    gender: "male",
    skinColor: "#F1C27D",
    hairColor: "#3D2B1F",
    hairStyle: "short",
    face: "oval",
    nose: "normal",
    eyes: "normal",
    beard: "none",
  });

  function update(field, value) {
    setCharacter((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  return (
    <div className="character-page">
      <div className="character-header">
        <h1>Meu Personagem</h1>
        <p>
          Personalize seu avatar para explorar o universo do jogo.
        </p>
      </div>

      <div className="character-layout">
        {/* Menu */}

        <aside className="character-sidebar">
          <button>👤 Corpo</button>
          <button>🙂 Rosto</button>
          <button>💇 Cabelo</button>
          <button>🧔 Barba</button>
          <button>👕 Roupa</button>
          <button>🎒 Acessórios</button>
        </aside>

        {/* Preview */}

        <section className="character-preview">

          {/* Futuramente substituir pelo Canvas do React Three Fiber */}

          <div className="preview-placeholder">
            <h2>Visualização 3D</h2>

            <p>
              Aqui ficará o personagem renderizado.
            </p>

            <div className="preview-info">
              <p><strong>Sexo:</strong> {character.gender}</p>
              <p><strong>Pele:</strong> {character.skinColor}</p>
              <p><strong>Cabelo:</strong> {character.hairStyle}</p>
              <p><strong>Cor:</strong> {character.hairColor}</p>
              <p><strong>Rosto:</strong> {character.face}</p>
              <p><strong>Nariz:</strong> {character.nose}</p>
              <p><strong>Olhos:</strong> {character.eyes}</p>
              <p><strong>Barba:</strong> {character.beard}</p>
            </div>
          </div>

        </section>

        {/* Configurações */}

        <aside className="character-options">

          <h3>Sexo</h3>

          <select
            value={character.gender}
            onChange={(e) => update("gender", e.target.value)}
          >
            <option value="male">Homem</option>
            <option value="female">Mulher</option>
          </select>

          <h3>Cor da Pele</h3>

          <input
            type="color"
            value={character.skinColor}
            onChange={(e) => update("skinColor", e.target.value)}
          />

          <h3>Formato do Rosto</h3>

          <select
            value={character.face}
            onChange={(e) => update("face", e.target.value)}
          >
            <option value="oval">Oval</option>
            <option value="round">Redondo</option>
            <option value="square">Quadrado</option>
            <option value="thin">Fino</option>
          </select>

          <h3>Nariz</h3>

          <select
            value={character.nose}
            onChange={(e) => update("nose", e.target.value)}
          >
            <option value="small">Pequeno</option>
            <option value="normal">Normal</option>
            <option value="large">Grande</option>
          </select>

          <h3>Olhos</h3>

          <select
            value={character.eyes}
            onChange={(e) => update("eyes", e.target.value)}
          >
            <option value="normal">Normal</option>
            <option value="small">Pequenos</option>
            <option value="large">Grandes</option>
          </select>

          <h3>Cabelo</h3>

          <select
            value={character.hairStyle}
            onChange={(e) => update("hairStyle", e.target.value)}
          >
            <option value="short">Curto</option>
            <option value="medium">Médio</option>
            <option value="long">Longo</option>
            <option value="curly">Cacheado</option>
            <option value="afro">Afro</option>
            <option value="bald">Careca</option>
          </select>

          <h3>Cor do Cabelo</h3>

          <input
            type="color"
            value={character.hairColor}
            onChange={(e) => update("hairColor", e.target.value)}
          />

          <h3>Barba</h3>

          <select
            value={character.beard}
            onChange={(e) => update("beard", e.target.value)}
          >
            <option value="none">Sem barba</option>
            <option value="short">Curta</option>
            <option value="medium">Média</option>
            <option value="long">Longa</option>
          </select>

          <button className="save-character">
            Salvar Personagem
          </button>

        </aside>
      </div>
    </div>
  );
}

export default PersonagemPage;