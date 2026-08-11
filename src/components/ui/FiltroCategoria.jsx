// src/components/ui/FiltroCategoria.jsx
//
// Par de selects materia -> subcategoria. A subcategoria depende da materia
// escolhida, entao trocar a materia sempre limpa a subcategoria (senao
// sobraria um filtro impossivel, tipo "Historia · Potenciacao").

import { nomeDaCategoria, nomeDaSubcategoria } from "./formato";

function FiltroCategoria({
  catalogo = [],
  categoria = "",
  subcategoria = "",
  onChange,
  desabilitado = false,
  rotuloCategoria = "Matéria",
  rotuloSubcategoria = "Assunto",
}) {
  const categorias = catalogo
    .map((grupo) => nomeDaCategoria(grupo))
    .filter(Boolean);

  const grupoAtual = catalogo.find(
    (grupo) => nomeDaCategoria(grupo) === categoria
  );

  const subcategorias = (grupoAtual?.subcategorias ?? [])
    .map((item) => nomeDaSubcategoria(item))
    .filter(Boolean);

  return (
    <>
      <div className="col-6 col-md-4 col-lg-3">
        <label className="form-label text-light small mb-1" htmlFor="filtro-materia">
          {rotuloCategoria}
        </label>

        <select
          id="filtro-materia"
          className="form-select form-select-sm"
          value={categoria}
          disabled={desabilitado}
          onChange={(e) =>
            onChange({ categoria: e.target.value, subcategoria: "" })
          }
        >
          <option value="">Todas</option>

          {categorias.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
      </div>

      <div className="col-6 col-md-4 col-lg-3">
        <label className="form-label text-light small mb-1" htmlFor="filtro-assunto">
          {rotuloSubcategoria}
        </label>

        <select
          id="filtro-assunto"
          className="form-select form-select-sm"
          value={subcategoria}
          disabled={desabilitado || !categoria || subcategorias.length === 0}
          onChange={(e) =>
            onChange({ categoria, subcategoria: e.target.value })
          }
        >
          <option value="">
            {categoria ? "Todos os assuntos" : "Escolha a matéria"}
          </option>

          {subcategorias.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default FiltroCategoria;
