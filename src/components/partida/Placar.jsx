// src/components/partida/Placar.jsx

const MEDALHAS = ["🥇", "🥈", "🥉"];

function Placar({ jogadores = [], meuId, limite }) {
  const lista = limite ? jogadores.slice(0, limite) : jogadores;

  if (lista.length === 0) {
    return (
      <p className="text-light mb-0">Ninguém pontuou ainda.</p>
    );
  }

  return (
    <div>
      {lista.map((jogador, indice) => (
        <div
          key={jogador.id}
          className={`partida-placar-linha ${
            jogador.player_id === meuId ? "partida-placar-eu" : ""
          }`}
        >
          <span className="partida-placar-posicao">
            {MEDALHAS[indice] ?? indice + 1}
          </span>

          <span className="flex-grow-1 fw-semibold text-white">
            {jogador.nome}
            {jogador.player_id === meuId && (
              <span className="text-light small ms-2">(você)</span>
            )}
          </span>

          {jogador.streak >= 2 && (
            <span className="text-warning small fw-bold">
              🔥 {jogador.streak}
            </span>
          )}

          <span className="fw-bold text-white" style={{ minWidth: "70px", textAlign: "right" }}>
            {jogador.pontos}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Placar;
