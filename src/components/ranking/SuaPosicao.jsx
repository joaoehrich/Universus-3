// src/components/ranking/SuaPosicao.jsx
//
// Faixa fixa com a posicao de quem esta logado. Aparece mesmo quando ele
// esta fora do top 50 — a pergunta "e eu, onde estou?" e a primeira que o
// aluno faz ao abrir o ranking.

import AvatarInicial from "../ui/AvatarInicial";
import BarraAproveitamento from "../ui/BarraAproveitamento";
import { CORES, corAproveitamento } from "../ui/formato";

function SuaPosicao({ jogador, dentroDoTop }) {
  if (!jogador) return null;

  return (
    <div className="faixa-voce p-3 p-md-4 mb-4">
      <div className="row g-3 align-items-center">
        <div className="col-12 col-md-5">
          <div className="d-flex align-items-center gap-3">
            <div className="text-center" style={{ minWidth: "56px" }}>
              <div className="h3 fw-bold text-white mb-0">
                {jogador.posicao}º
              </div>

              <div className="small" style={{ color: CORES.lilas }}>
                sua posição
              </div>
            </div>

            <AvatarInicial nome={jogador.nome} tamanho={46} borda={CORES.lilas} />

            <div className="min-w-0">
              <div className="text-white fw-bold text-truncate">
                {jogador.nome}
              </div>

              <div className="small text-light">
                Nível {jogador.nivel} · {jogador.xp} XP
                {!dentroDoTop && " · fora do top exibido"}
              </div>
            </div>
          </div>
        </div>

        <div className="col-4 col-md-2 text-center">
          <div className="h5 fw-bold text-white mb-0">{jogador.pontos}</div>
          <div className="small text-light">pontos</div>
        </div>

        <div className="col-4 col-md-2 text-center">
          <div className="h5 fw-bold text-white mb-0">{jogador.partidas}</div>
          <div className="small text-light">partidas</div>
        </div>

        <div className="col-4 col-md-3">
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-light">aproveitamento</span>

            <span
              className="fw-bold"
              style={{ color: corAproveitamento(jogador.aproveitamento) }}
            >
              {jogador.aproveitamento}%
            </span>
          </div>

          <BarraAproveitamento
            valor={jogador.aproveitamento}
            altura={8}
            legenda="Seu aproveitamento"
          />

          <div className="small mt-1" style={{ color: CORES.apagado }}>
            🔥 melhor sequência: {jogador.melhor_streak}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuaPosicao;
