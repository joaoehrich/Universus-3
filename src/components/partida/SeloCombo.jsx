// src/components/partida/SeloCombo.jsx

import { multiplicadorDoCombo } from "../../lib/partida";

function SeloCombo({ streak = 0 }) {
  const multiplicador = multiplicadorDoCombo(streak);
  const aceso = streak >= 2;

  return (
    <span className={`partida-combo ${aceso ? "" : "partida-combo-frio"}`}>
      <span>{aceso ? "🔥" : "❄️"}</span>

      <span>
        {streak > 0 ? `${streak} seguidas` : "sem sequência"} ·{" "}
        {multiplicador.toFixed(1)}x
      </span>
    </span>
  );
}

export default SeloCombo;
