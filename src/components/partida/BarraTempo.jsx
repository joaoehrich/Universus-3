// src/components/partida/BarraTempo.jsx
//
// Conta o tempo da pergunta a partir do horario que o servidor gravou
// em salas.pergunta_iniciada_em, para todo mundo ver o mesmo relogio.
// As telas montam este componente com key={pergunta_id}, entao cada
// pergunta comeca com o cronometro zerado sem precisar resetar estado.

import { useEffect, useRef, useState } from "react";

function segundosRestantes(iniciadaEm, tempo) {
  if (!iniciadaEm) return tempo;

  const passado = (Date.now() - new Date(iniciadaEm).getTime()) / 1000;

  return Math.max(0, Math.min(tempo, tempo - passado));
}

function BarraTempo({ iniciadaEm, tempo = 30, congelado = false, aoEsgotar }) {
  const [restante, setRestante] = useState(() =>
    segundosRestantes(iniciadaEm, tempo)
  );

  const jaAvisou = useRef(false);

  useEffect(() => {
    if (congelado) return;

    const relogio = setInterval(() => {
      const valor = segundosRestantes(iniciadaEm, tempo);

      setRestante(valor);

      if (valor <= 0 && !jaAvisou.current) {
        jaAvisou.current = true;
        aoEsgotar?.();
      }
    }, 100);

    return () => clearInterval(relogio);
  }, [iniciadaEm, tempo, congelado, aoEsgotar]);

  const percentual = tempo > 0 ? (restante / tempo) * 100 : 0;
  const critico = !congelado && restante <= 5 && restante > 0;

  return (
    <div className="d-flex align-items-center gap-3">
      <span
        className={`fw-bold ${critico ? "partida-tempo-critico" : ""}`}
        style={{
          minWidth: "56px",
          fontSize: "1.4rem",
          color: restante <= 5 ? "#EF4444" : "#fff",
        }}
      >
        {Math.ceil(restante)}s
      </span>

      <div className="partida-tempo flex-grow-1">
        <div
          className={`partida-tempo-preenchimento ${
            critico ? "partida-tempo-critico" : ""
          }`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export default BarraTempo;
