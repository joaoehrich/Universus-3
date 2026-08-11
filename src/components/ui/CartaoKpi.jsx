// src/components/ui/CartaoKpi.jsx
//
// Cartao de metrica. O `detalhe` existe porque numero sozinho nao comunica:
// "72%" vira "72% — 180 de 250 perguntas".

import { PAINEL, CORES } from "./formato";

function CartaoKpi({ valor, rotulo, detalhe, cor = CORES.lilas, icone }) {
  return (
    <div className="card border-0 h-100" style={PAINEL}>
      <div className="card-body text-center d-flex flex-column justify-content-center py-4">
        {icone && (
          <div style={{ fontSize: "1.4rem", lineHeight: 1 }} aria-hidden="true">
            {icone}
          </div>
        )}

        <h2 className="mb-1 fw-bold" style={{ color: cor }}>
          {valor}
        </h2>

        <p className="text-light mb-0 small">{rotulo}</p>

        {detalhe && (
          <p className="mb-0 mt-1" style={{ fontSize: ".75rem", color: CORES.apagado }}>
            {detalhe}
          </p>
        )}
      </div>
    </div>
  );
}

export default CartaoKpi;
