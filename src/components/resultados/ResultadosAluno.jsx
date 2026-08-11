// src/components/resultados/ResultadosAluno.jsx
//
// O que o aluno ve em "Meus Resultados": resumo, evolucao, o que precisa
// estudar e o historico filtravel com o caminho para rever as respostas.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatarData,
  meuDesempenhoPorTema,
  meuHistorico,
  resumoDoHistorico,
} from "../../lib/relatorios";
import CartaoKpi from "../ui/CartaoKpi";
import BarraAproveitamento from "../ui/BarraAproveitamento";
import GraficoEvolucao from "../ui/GraficoEvolucao";
import EstadoVazio from "../ui/EstadoVazio";
import DesempenhoTemas from "./DesempenhoTemas";
import {
  PAINEL,
  CORES,
  corAproveitamento,
  rotuloTema,
} from "../ui/formato";

// Doze partidas cabem no grafico sem virar risco continuo.
const PARTIDAS_NO_GRAFICO = 12;

function ResultadosAluno({ perfil }) {
  const [historico, setHistorico] = useState([]);
  const [temas, setTemas] = useState([]);
  const [filtro, setFiltro] = useState({ categoria: "", subcategoria: "" });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        setErro("");

        const [partidas, porTema] = await Promise.all([
          meuHistorico(perfil.id),
          meuDesempenhoPorTema(perfil.id),
        ]);

        if (!ativo) return;

        setHistorico(partidas ?? []);
        setTemas(porTema ?? []);
      } catch (err) {
        if (ativo) setErro(err.message);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [perfil]);

  const resumo = useMemo(() => resumoDoHistorico(historico), [historico]);

  // Materias e assuntos do filtro saem do proprio historico: so faz sentido
  // filtrar por aquilo que o aluno realmente jogou.
  const materias = useMemo(() => {
    const mapa = new Map();

    for (const partida of historico) {
      const materia = (partida.categoria ?? "").trim() || "Sem matéria";
      const assunto = (partida.subcategoria ?? "").trim();

      const atual = mapa.get(materia) ?? new Set();

      if (assunto) atual.add(assunto);

      mapa.set(materia, atual);
    }

    return [...mapa.entries()].map(([nome, assuntos]) => ({
      nome,
      assuntos: [...assuntos].sort((a, b) => a.localeCompare(b, "pt-BR")),
    }));
  }, [historico]);

  const assuntosDaMateria =
    materias.find((item) => item.nome === filtro.categoria)?.assuntos ?? [];

  const visiveis = historico.filter((partida) => {
    const materia = (partida.categoria ?? "").trim() || "Sem matéria";

    if (filtro.categoria && materia !== filtro.categoria) return false;

    if (
      filtro.subcategoria &&
      (partida.subcategoria ?? "").trim() !== filtro.subcategoria
    ) {
      return false;
    }

    return true;
  });

  // O historico vem do mais novo para o mais antigo; o grafico precisa da
  // ordem cronologica para "evolucao" fazer sentido.
  const evolucao = [...historico]
    .slice(0, PARTIDAS_NO_GRAFICO)
    .reverse()
    .map((partida) => ({
      rotulo: formatarData(partida.jogado_em),
      valor: partida.aproveitamento ?? 0,
    }));

  if (carregando) {
    return <p className="text-light">Carregando seus resultados...</p>;
  }

  if (erro) {
    return <div className="alert alert-danger">{erro}</div>;
  }

  if (historico.length === 0) {
    return (
      <EstadoVazio
        icone="🛸"
        titulo="Você ainda não jogou nenhuma partida"
        texto="Peça o código de uma sala ao seu professor para começar."
        acao={{ para: "/dashboard/entrar-sala", texto: "🎮 Entrar em Sala" }}
      />
    );
  }

  return (
    <>
      {/* Resumo */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="🎮"
            valor={resumo.partidas}
            rotulo="Partidas jogadas"
            detalhe={`última em ${formatarData(historico[0]?.jogado_em)}`}
            cor={CORES.lilas}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="🎯"
            valor={
              resumo.aproveitamento === null ? "–" : `${resumo.aproveitamento}%`
            }
            rotulo="Aproveitamento"
            detalhe={`${resumo.acertos ?? 0} de ${resumo.perguntas ?? 0} perguntas`}
            cor={corAproveitamento(resumo.aproveitamento)}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="⭐"
            valor={resumo.pontos}
            rotulo="Pontos totais"
            detalhe={
              resumo.partidas
                ? `${Math.round(resumo.pontos / resumo.partidas)} por partida`
                : undefined
            }
            cor={CORES.azul}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="🔥"
            valor={resumo.melhorStreak}
            rotulo="Melhor sequência"
            detalhe={`${resumo.vitorias ?? 0} vitórias · ${
              resumo.podios ?? 0
            } pódios`}
            cor={CORES.ambar}
          />
        </div>
      </div>

      {/* Evolucao */}
      {evolucao.length > 1 && (
        <div className="card border-0 mb-4" style={PAINEL}>
          <div className="card-body p-4">
            <h5 className="text-white mb-1">Sua evolução</h5>

            <p className="text-light small mb-3">
              Aproveitamento das últimas {evolucao.length} partidas, da mais
              antiga para a mais recente.
            </p>

            <GraficoEvolucao
              pontos={evolucao}
              cor={CORES.lilas}
              titulo="Aproveitamento por partida"
            />
          </div>
        </div>
      )}

      {/* Desempenho por materia e assunto */}
      <div className="mb-2">
        <h5 className="text-white mb-1">O que estudar</h5>

        <p className="text-light small mb-3">
          Seu aproveitamento por matéria e assunto. O que está mais fraco vem
          primeiro.
        </p>
      </div>

      {temas.length === 0 ? (
        <div className="card border-0 mb-4" style={PAINEL}>
          <div className="card-body text-center py-4">
            <p className="text-light mb-0">
              Ainda não há respostas suficientes para separar por assunto.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <DesempenhoTemas linhas={temas} />
        </div>
      )}

      {/* Historico */}
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h5 className="text-white mb-1">Histórico de partidas</h5>

          <p className="text-light small mb-0">
            {visiveis.length} de {historico.length} partidas
          </p>
        </div>

        <div className="row g-2">
          <div className="col-auto">
            <select
              className="form-select form-select-sm"
              aria-label="Filtrar por matéria"
              value={filtro.categoria}
              onChange={(e) =>
                setFiltro({ categoria: e.target.value, subcategoria: "" })
              }
            >
              <option value="">Todas as matérias</option>

              {materias.map((materia) => (
                <option key={materia.nome} value={materia.nome}>
                  {materia.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-auto">
            <select
              className="form-select form-select-sm"
              aria-label="Filtrar por assunto"
              value={filtro.subcategoria}
              disabled={!filtro.categoria || assuntosDaMateria.length === 0}
              onChange={(e) =>
                setFiltro((atual) => ({
                  ...atual,
                  subcategoria: e.target.value,
                }))
              }
            >
              <option value="">
                {filtro.categoria ? "Todos os assuntos" : "Escolha a matéria"}
              </option>

              {assuntosDaMateria.map((assunto) => (
                <option key={assunto} value={assunto}>
                  {assunto}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card border-0" style={PAINEL}>
        <div className="card-body p-0 table-responsive">
          <table className="table table-dark table-borderless align-middle tabela-relatorio">
            <thead>
              <tr>
                <th>Data</th>
                <th>Quiz</th>
                <th>Matéria</th>
                <th className="text-end">Colocação</th>
                <th style={{ minWidth: "150px" }}>Aproveitamento</th>
                <th className="text-end">Pontos</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {visiveis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-light py-4">
                    Nenhuma partida nesse recorte.
                  </td>
                </tr>
              ) : (
                visiveis.map((partida) => {
                  const encerrada = partida.estado === "encerrada";
                  const podio = encerrada && partida.colocacao <= 3;

                  return (
                    <tr key={partida.sala_id}>
                      <td className="text-light small">
                        {formatarData(partida.jogado_em)}
                      </td>

                      <td className="text-white">{partida.quiz_titulo}</td>

                      <td className="text-light small">
                        {rotuloTema(partida.categoria, partida.subcategoria)}
                      </td>

                      <td className="text-end">
                        {encerrada ? (
                          <span
                            className="fw-bold"
                            style={{ color: podio ? CORES.ambar : "#fff" }}
                          >
                            {partida.colocacao}º
                            <span className="text-light fw-normal small">
                              {" "}
                              de {partida.participantes}
                            </span>
                          </span>
                        ) : (
                          <span className="text-light">—</span>
                        )}
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="flex-grow-1">
                            <BarraAproveitamento
                              valor={partida.aproveitamento}
                              altura={8}
                              legenda={`Aproveitamento em ${partida.quiz_titulo}`}
                            />
                          </div>

                          <span
                            className="small fw-bold"
                            style={{
                              color: corAproveitamento(partida.aproveitamento),
                              minWidth: "38px",
                              textAlign: "right",
                            }}
                          >
                            {partida.aproveitamento}%
                          </span>
                        </div>

                        <span
                          className="small"
                          style={{ color: CORES.apagado }}
                        >
                          {partida.acertos} de {partida.total_perguntas}{" "}
                          perguntas
                        </span>
                      </td>

                      <td className="text-end fw-bold text-white">
                        {partida.pontos}
                      </td>

                      <td className="text-end">
                        {encerrada ? (
                          <Link
                            to={`/dashboard/resultados/${partida.sala_id}`}
                            className="btn btn-sm btn-outline-light text-nowrap"
                          >
                            Ver respostas
                          </Link>
                        ) : (
                          <span className="badge bg-secondary">
                            Em andamento
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ResultadosAluno;
