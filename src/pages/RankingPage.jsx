// src/pages/RankingPage.jsx
//
// Ranking com podio, filtros de periodo/materia/assunto e a faixa "sua
// posicao" — que aparece mesmo quando o jogador esta fora do top exibido.

import { useEffect, useRef, useState } from "react";
import { catalogoCategorias, minhaPosicao, rankingGeral } from "../lib/ranking";
import PodioRanking from "../components/ranking/PodioRanking";
import LinhaRanking from "../components/ranking/LinhaRanking";
import SuaPosicao from "../components/ranking/SuaPosicao";
import FiltroCategoria from "../components/ui/FiltroCategoria";
import EstadoVazio from "../components/ui/EstadoVazio";
import { PAINEL, CORES, rotuloTema } from "../components/ui/formato";
import "../styles/relatorios.css";

const LIMITE = 50;

const PERIODOS = [
  { valor: "semana", texto: "Semana" },
  { valor: "mes", texto: "Mês" },
  { valor: "sempre", texto: "Sempre" },
];

function RankingPage() {
  const [filtros, setFiltros] = useState({
    periodo: "sempre",
    categoria: "",
    subcategoria: "",
  });

  const [catalogo, setCatalogo] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [minha, setMinha] = useState(null);

  // Dois estados de espera: o primeiro carregamento monta a tela, a troca de
  // filtro so esmaece o que ja esta na frente do usuario.
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const jaCarregou = useRef(false);

  // O catalogo nao muda com o filtro: carrega uma vez so.
  useEffect(() => {
    let ativo = true;

    catalogoCategorias()
      .then((dados) => {
        if (ativo) setCatalogo(dados ?? []);
      })
      .catch(() => {
        // Sem catalogo o ranking geral continua util: nao vira erro de tela.
        if (ativo) setCatalogo([]);
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setErro("");

        // Depois da primeira carga a tela ja tem conteudo: trocar o filtro
        // esmaece a lista em vez de derrubar o layout inteiro.
        if (jaCarregou.current) setAtualizando(true);

        const consulta = {
          categoria: filtros.categoria || null,
          subcategoria: filtros.subcategoria || null,
          periodo: filtros.periodo,
        };

        const [lista, eu] = await Promise.all([
          rankingGeral({ ...consulta, limite: LIMITE }),
          minhaPosicao(consulta),
        ]);

        if (!ativo) return;

        setLinhas(lista ?? []);
        setMinha(eu ?? null);
      } catch (err) {
        if (ativo) setErro(err.message);
      } finally {
        if (ativo) {
          jaCarregou.current = true;
          setCarregandoInicial(false);
          setAtualizando(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [filtros]);

  const top = linhas.slice(0, 3);
  const demais = linhas.slice(3);
  const dentroDoTop = linhas.some((jogador) => jogador.eh_voce);

  const temFiltro = Boolean(filtros.categoria || filtros.periodo !== "sempre");

  // "Sempre" e o padrao: repetir isso no subtitulo so faria ruido.
  const recorte = [
    filtros.categoria ? rotuloTema(filtros.categoria, filtros.subcategoria) : null,
    filtros.periodo === "sempre"
      ? null
      : PERIODOS.find((item) => item.valor === filtros.periodo)?.texto,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="display-6 fw-bold text-white mb-1">Ranking 🏆</h1>

        <p className="text-light mb-0">
          Os exploradores que mais pontuaram no Universus
          {recorte ? ` — ${recorte}.` : "."}
        </p>
      </div>

      {/* Filtros */}
      <div className="card border-0 mb-4" style={PAINEL}>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4 col-lg-4">
              <span className="form-label text-light small mb-1 d-block">
                Período
              </span>

              <div className="btn-group w-100" role="group" aria-label="Período">
                {PERIODOS.map((item) => (
                  <button
                    key={item.valor}
                    type="button"
                    className={`btn btn-sm ${
                      filtros.periodo === item.valor
                        ? "btn-light"
                        : "btn-outline-light"
                    }`}
                    onClick={() =>
                      setFiltros((atual) => ({ ...atual, periodo: item.valor }))
                    }
                  >
                    {item.texto}
                  </button>
                ))}
              </div>
            </div>

            <FiltroCategoria
              catalogo={catalogo}
              categoria={filtros.categoria}
              subcategoria={filtros.subcategoria}
              onChange={({ categoria, subcategoria }) =>
                setFiltros((atual) => ({ ...atual, categoria, subcategoria }))
              }
            />

            <div className="col-12 col-lg-2 d-flex align-items-end gap-2">
              {temFiltro && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light w-100"
                  onClick={() =>
                    setFiltros({
                      periodo: "sempre",
                      categoria: "",
                      subcategoria: "",
                    })
                  }
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {atualizando && (
            <p className="small mb-0 mt-2" style={{ color: CORES.lilas }}>
              Atualizando o recorte...
            </p>
          )}
        </div>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregandoInicial ? (
        <p className="text-light">Carregando ranking...</p>
      ) : (
        <div className={atualizando ? "conteudo-atualizando" : undefined}>
          {linhas.length === 0 ? (
            <EstadoVazio
              icone="🪐"
              titulo="Ninguém pontuou nesse recorte ainda"
              texto={
                temFiltro
                  ? "Tente outro período ou outra matéria — ou seja o primeiro a jogar esse assunto."
                  : "Assim que a primeira partida terminar, o ranking aparece aqui."
              }
              acao={{ para: "/dashboard/entrar-sala", texto: "🎮 Entrar em Sala" }}
            />
          ) : (
            <>
              <PodioRanking top={top} />

              {minha ? (
                <SuaPosicao jogador={minha} dentroDoTop={dentroDoTop} />
              ) : (
                <div className="faixa-voce p-3 p-md-4 mb-4">
                  <p className="text-white mb-1 fw-bold">
                    Você ainda não pontuou nesse recorte
                  </p>

                  <p className="text-light small mb-0">
                    {temFiltro
                      ? "Jogue uma partida desse assunto (ou troque o período) para entrar na disputa."
                      : "Entre em uma sala e sua posição aparece aqui na hora."}
                  </p>
                </div>
              )}

              {demais.length > 0 && (
                <div className="card border-0" style={PAINEL}>
                  <div className="card-body p-0 table-responsive">
                    <table className="table table-dark table-borderless align-middle tabela-relatorio">
                      <thead>
                        <tr>
                          <th style={{ width: "70px" }}>#</th>
                          <th>Jogador</th>
                          <th className="text-end">Pontos</th>
                          <th className="text-end">Partidas</th>
                          <th>Aproveitamento</th>
                          <th className="text-end">Sequência</th>
                        </tr>
                      </thead>

                      <tbody>
                        {demais.map((jogador) => (
                          <LinhaRanking
                            key={jogador.player_id}
                            jogador={jogador}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-light small mt-3 mb-0">
                Mostrando os {Math.min(linhas.length, LIMITE)} primeiros
                colocados.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default RankingPage;
