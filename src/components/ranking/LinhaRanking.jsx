// src/components/ranking/LinhaRanking.jsx
//
// Uma linha da tabela do ranking. Vira componente porque a mesma linha
// aparece na lista geral e pode ser reaproveitada em recortes futuros.

import AvatarInicial from "../ui/AvatarInicial";
import BarraAproveitamento from "../ui/BarraAproveitamento";
import { CORES, corAproveitamento } from "../ui/formato";

function LinhaRanking({ jogador }) {
  return (
    <tr className={jogador.eh_voce ? "linha-voce" : undefined}>
      <td className="text-light fw-bold">{jogador.posicao}º</td>

      <td>
        <div className="d-flex align-items-center gap-2">
          <AvatarInicial nome={jogador.nome} tamanho={34} />

          <div className="min-w-0">
            <span className="text-white d-block text-truncate">
              {jogador.nome}
              {jogador.eh_voce && (
                <span
                  className="badge ms-2"
                  style={{ background: CORES.roxo, fontSize: ".65rem" }}
                >
                  você
                </span>
              )}
            </span>

            <span className="small" style={{ color: CORES.lilas }}>
              Nível {jogador.nivel} · {jogador.xp} XP
            </span>
          </div>
        </div>
      </td>

      <td className="text-end fw-bold text-white">{jogador.pontos}</td>

      <td className="text-end text-light">{jogador.partidas}</td>

      <td style={{ minWidth: "160px" }}>
        <div className="d-flex align-items-center gap-2">
          <div className="flex-grow-1">
            <BarraAproveitamento
              valor={jogador.aproveitamento}
              altura={8}
              legenda={`Aproveitamento de ${jogador.nome}`}
            />
          </div>

          <span
            className="small fw-bold"
            style={{
              color: corAproveitamento(jogador.aproveitamento),
              minWidth: "38px",
              textAlign: "right",
            }}
          >
            {jogador.aproveitamento}%
          </span>
        </div>

        <span className="small" style={{ color: CORES.apagado }}>
          {jogador.acertos} de {jogador.respondidas} perguntas
        </span>
      </td>

      <td className="text-end text-light">🔥 {jogador.melhor_streak}</td>
    </tr>
  );
}

export default LinhaRanking;
