// src/components/ui/BarraAproveitamento.jsx
//
// Barra de 0 a 100 colorida pela faixa: verde/ambar/vermelho dizem em um
// relance se o assunto esta dominado ou se precisa de estudo.

import { corAproveitamento } from "./formato";

function BarraAproveitamento({
  valor,
  cor,
  altura = 10,
  mostrarTexto = false,
  legenda,
}) {
  const seguro = Math.max(0, Math.min(100, Number(valor) || 0));
  const pintura = cor ?? corAproveitamento(valor);

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={seguro}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={legenda ?? "Aproveitamento"}
        style={{
          background: "rgba(255,255,255,.08)",
          borderRadius: "999px",
          height: `${altura}px`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${seguro}%`,
            height: "100%",
            background: pintura,
            borderRadius: "999px",
            transition: "width .4s ease",
          }}
        />
      </div>

      {mostrarTexto && (
        <p className="mb-0 mt-1 small" style={{ color: pintura }}>
          {seguro}%{legenda ? ` · ${legenda}` : ""}
        </p>
      )}
    </div>
  );
}

export default BarraAproveitamento;
