// src/components/ui/EstadoVazio.jsx
//
// Tela vazia nunca fica so no "nada aqui": sempre aponta o proximo passo.

import { Link } from "react-router-dom";
import { PAINEL, CORES } from "./formato";

function EstadoVazio({ icone = "🔭", titulo, texto, acao, children }) {
  return (
    <div className="card border-0 text-center" style={PAINEL}>
      <div className="card-body py-5">
        <div style={{ fontSize: "3rem", lineHeight: 1 }} aria-hidden="true">
          {icone}
        </div>

        <h4 className="text-white mt-3">{titulo}</h4>

        {texto && <p className="text-light mb-0">{texto}</p>}

        {acao && (
          <Link
            to={acao.para}
            className="btn mt-3"
            style={{ background: CORES.roxo, color: "#fff", border: "none" }}
          >
            {acao.texto}
          </Link>
        )}

        {children}
      </div>
    </div>
  );
}

export default EstadoVazio;
