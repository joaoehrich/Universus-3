// src/components/resultados/DesempenhoTemas.jsx
//
// Aproveitamento agrupado por materia, com as subcategorias dentro. O pior
// vem primeiro de proposito: e o que precisa de estudo (aluno) ou de revisao
// em aula (professor).

import BarraAproveitamento from "../ui/BarraAproveitamento";
import { PAINEL, CORES, faixaAproveitamento, percentual } from "../ui/formato";

// Junta as linhas soltas da RPC em { materia -> subcategorias }.
function agruparPorMateria(linhas = []) {
  const grupos = new Map();

  for (const linha of linhas) {
    const materia = (linha.categoria ?? "").trim() || "Sem matéria";

    const grupo = grupos.get(materia) ?? {
      materia,
      respondidas: 0,
      acertos: 0,
      itens: [],
    };

    grupo.respondidas += linha.respondidas ?? 0;
    grupo.acertos += linha.acertos ?? 0;

    grupo.itens.push({
      ...linha,
      // Pergunta sem subcategoria ainda pertence a materia: vira "Geral".
      assunto: (linha.subcategoria ?? "").trim() || "Geral",
    });

    grupos.set(materia, grupo);
  }

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      aproveitamento: percentual(grupo.acertos, grupo.respondidas),
      itens: grupo.itens.sort(
        (a, b) => (a.aproveitamento ?? 0) - (b.aproveitamento ?? 0)
      ),
    }))
    .sort((a, b) => a.aproveitamento - b.aproveitamento);
}

function DesempenhoTemas({ linhas = [], detalhe }) {
  const grupos = agruparPorMateria(linhas);

  return (
    <div className="d-flex flex-column gap-3">
      {grupos.map((grupo) => {
        const marca = faixaAproveitamento(grupo.aproveitamento);

        return (
          <div key={grupo.materia} className="card border-0" style={PAINEL}>
            <div className="card-body p-4">
              {/* Cabecalho da materia */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="text-white mb-0">📚 {grupo.materia}</h5>

                <div className="d-flex align-items-center gap-3">
                  <span className="text-light small">
                    {grupo.acertos} de {grupo.respondidas} perguntas
                  </span>

                  <span
                    className="badge"
                    style={{ background: marca.cor, color: "#0b1020" }}
                  >
                    {grupo.aproveitamento}% · {marca.texto}
                  </span>
                </div>
              </div>

              <BarraAproveitamento
                valor={grupo.aproveitamento}
                altura={12}
                legenda={`Aproveitamento em ${grupo.materia}`}
              />

              {/* Subcategorias da materia */}
              <div className="mt-3 d-flex flex-column gap-2">
                {grupo.itens.map((item) => (
                  <div
                    key={`${grupo.materia}-${item.assunto}`}
                    className="row g-2 align-items-center"
                  >
                    <div className="col-12 col-md-4">
                      <span className="text-white small">{item.assunto}</span>

                      {detalhe && (
                        <span
                          className="d-block"
                          style={{ fontSize: ".72rem", color: CORES.apagado }}
                        >
                          {detalhe(item)}
                        </span>
                      )}
                    </div>

                    <div className="col-8 col-md-6">
                      <BarraAproveitamento
                        valor={item.aproveitamento}
                        altura={8}
                        legenda={`Aproveitamento em ${item.assunto}`}
                      />
                    </div>

                    <div className="col-4 col-md-2 text-end">
                      <span
                        className="small fw-bold"
                        style={{
                          color: faixaAproveitamento(item.aproveitamento).cor,
                        }}
                      >
                        {item.aproveitamento}%
                      </span>

                      <span
                        className="d-block"
                        style={{ fontSize: ".72rem", color: CORES.apagado }}
                      >
                        {item.acertos}/{item.respondidas}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DesempenhoTemas;
