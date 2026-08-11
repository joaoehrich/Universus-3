// src/components/ranking/PodioRanking.jsx
//
// Os tres primeiros em destaque. Quem abre o ranking quer saber quem esta
// ganhando antes de ler qualquer tabela.

import AvatarInicial from "../ui/AvatarInicial";
import { MEDALHAS, CORES, corAproveitamento } from "../ui/formato";

const BRILHOS = ["#F59E0B", "#A78BFA", "#EC8B5E"];

function PodioRanking({ top = [] }) {
  if (top.length === 0) return null;

  return (
    <div className="podio mb-4">
      {top.slice(0, 3).map((jogador, indice) => {
        const lugar = indice + 1;

        return (
          <div
            key={jogador.player_id}
            className={`podio-lugar podio-lugar-${lugar}`}
            style={{ "--brilho": BRILHOS[indice] }}
          >
            <div className="podio-medalha" aria-hidden="true">
              {MEDALHAS[indice]}
            </div>

            <div className="d-flex justify-content-center my-2">
              <AvatarInicial
                nome={jogador.nome}
                tamanho={lugar === 1 ? 64 : 48}
                borda={jogador.eh_voce ? CORES.lilas : undefined}
              />
            </div>

            <h5 className="text-white mb-1 text-truncate" title={jogador.nome}>
              {jogador.nome}
              {jogador.eh_voce && (
                <span className="badge ms-2" style={{ background: CORES.roxo }}>
                  você
                </span>
              )}
            </h5>

            <p className="mb-2 small" style={{ color: CORES.lilas }}>
              Nível {jogador.nivel} · {jogador.xp} XP
            </p>

            <h3 className="fw-bold text-white mb-0">{jogador.pontos}</h3>

            <p className="text-light small mb-2">pontos</p>

            <div className="d-flex justify-content-center gap-3 small text-light">
              <span>{jogador.partidas} partidas</span>

              <span style={{ color: corAproveitamento(jogador.aproveitamento) }}>
                {jogador.aproveitamento}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PodioRanking;
