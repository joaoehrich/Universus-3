// src/components/partida/CartaoAlternativa.jsx

import { CORES_ALTERNATIVA, LETRAS_ALTERNATIVA } from "../../lib/partida";

function CartaoAlternativa({
  alternativa,
  indice,
  escolhida = false,
  revelando = false,
  desabilitada = false,
  aoEscolher,
}) {
  const cor = CORES_ALTERNATIVA[indice % CORES_ALTERNATIVA.length];

  // Durante a revelacao o banco devolve o campo "correta"; antes disso
  // ele vem nulo justamente para o aluno nao conseguir espiar.
  const certa = revelando && alternativa.correta === true;
  const errada = revelando && alternativa.correta !== true;

  const classes = [
    "partida-alternativa",
    escolhida ? "partida-alternativa-escolhida" : "",
    certa ? "partida-alternativa-certa" : "",
    errada ? "partida-alternativa-errada" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      style={{ background: cor }}
      disabled={desabilitada}
      onClick={() => aoEscolher?.(alternativa)}
    >
      <span className="partida-alternativa-letra">
        {LETRAS_ALTERNATIVA[indice] ?? indice + 1}
      </span>

      <span className="flex-grow-1">{alternativa.texto}</span>

      {certa && <i className="fas fa-check fa-lg"></i>}
      {escolhida && !revelando && <i className="fas fa-circle-check fa-lg"></i>}
    </button>
  );
}

export default CartaoAlternativa;
