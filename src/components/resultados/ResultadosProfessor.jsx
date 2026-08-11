// src/components/resultados/ResultadosProfessor.jsx
//
// Painel da turma. Antes o professor caia na tela do aluno e via as partidas
// que ele mesmo jogou (sempre vazio); aqui ele ve o que a turma produziu.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  alunosDoProfessor,
  desempenhoProfessorPorTema,
  partidasDoProfessor,
  resumoProfessor,
} from "../../lib/professor";
import { formatarData } from "../../lib/relatorios";
import CartaoKpi from "../ui/CartaoKpi";
import BarraAproveitamento from "../ui/BarraAproveitamento";
import AvatarInicial from "../ui/AvatarInicial";
import EstadoVazio from "../ui/EstadoVazio";
import DesempenhoTemas from "./DesempenhoTemas";
import {
  PAINEL,
  CORES,
  MEDALHAS,
  corAproveitamento,
  faixaAproveitamento,
  rotuloTema,
} from "../ui/formato";

const LIMITE_PARTIDAS = 50;
const LIMITE_ALUNOS = 100;

function SeloEstado({ estado }) {
  const encerrada = estado === "encerrada";

  return (
    <span
      className="badge"
      style={{
        background: encerrada ? "rgba(255,255,255,.12)" : "rgba(16,185,129,.25)",
        color: "#fff",
      }}
    >
      {encerrada ? "encerrada" : "ao vivo"}
    </span>
  );
}

function ResultadosProfessor() {
  const [resumo, setResumo] = useState(null);
  const [partidas, setPartidas] = useState([]);
  const [temas, setTemas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setErro("");

        // Quatro consultas independentes: em paralelo a tela abre de uma vez.
        const [geral, lista, porTema, turma] = await Promise.all([
          resumoProfessor(),
          partidasDoProfessor(LIMITE_PARTIDAS),
          desempenhoProfessorPorTema(),
          alunosDoProfessor(LIMITE_ALUNOS),
        ]);

        if (!ativo) return;

        setResumo(geral ?? null);
        setPartidas(lista ?? []);
        setTemas(porTema ?? []);
        setAlunos(turma ?? []);
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
  }, []);

  if (carregando) {
    return <p className="text-light">Carregando os dados da turma...</p>;
  }

  if (erro) {
    return <div className="alert alert-danger">{erro}</div>;
  }

  const semNada = !resumo || (resumo.quizzes === 0 && resumo.salas === 0);

  if (semNada) {
    return (
      <EstadoVazio
        icone="🧑‍🏫"
        titulo="Sua turma ainda não jogou"
        texto="O caminho é: criar um quiz, abrir uma sala com ele e passar o código para os alunos. Os resultados aparecem aqui assim que a primeira partida rodar."
        acao={{ para: "/dashboard/criar-quiz", texto: "➕ Criar Quiz" }}
      >
        <div className="mt-3">
          <Link to="/dashboard/jogos" className="btn btn-outline-light btn-sm">
            Ver meus quizzes
          </Link>
        </div>
      </EstadoVazio>
    );
  }

  const piorTema = temas.length > 0 ? [...temas].sort(
    (a, b) => (a.aproveitamento ?? 0) - (b.aproveitamento ?? 0)
  )[0] : null;

  return (
    <>
      {/* KPIs da turma */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="📝"
            valor={resumo.quizzes}
            rotulo="Quizzes criados"
            cor={CORES.lilas}
          />
        </div>

        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="🚪"
            valor={resumo.salas}
            rotulo="Salas abertas"
            detalhe={`${resumo.partidas_encerradas} encerradas`}
            cor={CORES.azul}
          />
        </div>

        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="👥"
            valor={resumo.alunos_unicos}
            rotulo="Alunos únicos"
            cor={CORES.roxo}
          />
        </div>

        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="🎯"
            valor={`${resumo.aproveitamento}%`}
            rotulo="Aproveitamento médio"
            detalhe={`${resumo.acertos} de ${resumo.respondidas} respostas`}
            cor={corAproveitamento(resumo.aproveitamento)}
          />
        </div>

        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="🙋"
            valor={resumo.media_participantes}
            rotulo="Média de participantes"
            detalhe="por partida"
            cor={CORES.ambar}
          />
        </div>

        <div className="col-6 col-lg-2">
          <CartaoKpi
            icone="🏁"
            valor={resumo.partidas_encerradas}
            rotulo="Partidas encerradas"
            cor={CORES.verde}
          />
        </div>
      </div>

      {/* Partidas conduzidas */}
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h5 className="text-white mb-1">Partidas que você conduziu</h5>

          <p className="text-light small mb-0">
            Clique em uma partida para ver o placar e qual pergunta derrubou a
            turma.
          </p>
        </div>
      </div>

      <div className="card border-0 mb-4" style={PAINEL}>
        <div className="card-body p-0 table-responsive">
          <table className="table table-dark table-borderless align-middle tabela-relatorio">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Matéria</th>
                <th>Quando</th>
                <th className="text-end">Alunos</th>
                <th className="text-end">Média</th>
                <th style={{ minWidth: "150px" }}>Aproveitamento</th>
                <th>Destaque</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {partidas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-light py-4">
                    Você ainda não abriu nenhuma sala.
                  </td>
                </tr>
              ) : (
                partidas.map((partida) => (
                  <tr key={partida.sala_id}>
                    <td>
                      <span className="text-white d-block">
                        {partida.quiz_titulo}
                      </span>

                      <span className="small" style={{ color: CORES.apagado }}>
                        sala {partida.codigo} · {partida.total_perguntas}{" "}
                        perguntas
                      </span>
                    </td>

                    <td className="text-light small">
                      {rotuloTema(partida.categoria, partida.subcategoria)}
                    </td>

                    <td className="text-light small">
                      <span className="d-block">
                        {formatarData(partida.criada_em)}
                      </span>

                      <SeloEstado estado={partida.estado} />
                    </td>

                    <td className="text-end text-white">
                      {partida.participantes}
                    </td>

                    <td className="text-end text-light">
                      <span className="text-white fw-bold d-block">
                        {partida.media_pontos}
                      </span>

                      <span className="small" style={{ color: CORES.apagado }}>
                        pontos
                      </span>
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <BarraAproveitamento
                            valor={partida.aproveitamento}
                            altura={8}
                            legenda={`Aproveitamento da sala ${partida.codigo}`}
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
                    </td>

                    <td className="text-light small">
                      {partida.melhor_nome ? (
                        <>
                          🥇 {partida.melhor_nome}
                          <span
                            className="d-block"
                            style={{ color: CORES.apagado }}
                          >
                            {partida.melhor_pontos} pontos
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="text-end">
                      <Link
                        to={`/dashboard/resultados/turma/${partida.sala_id}`}
                        className="btn btn-sm btn-outline-light text-nowrap"
                      >
                        Ver turma
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desempenho por materia/assunto */}
      <div className="mb-3">
        <h5 className="text-white mb-1">Onde a turma tropeça</h5>

        <p className="text-light small mb-0">
          Aproveitamento por matéria e assunto, do pior para o melhor.
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
        <>
          {piorTema && (
            <div
              className="alert d-flex flex-wrap align-items-center gap-2 mb-3"
              style={{
                background: "rgba(239,68,68,.12)",
                border: `1px solid ${faixaAproveitamento(
                  piorTema.aproveitamento
                ).cor}55`,
                color: "#fff",
                borderRadius: "16px",
              }}
            >
              <strong>Atenção:</strong>
              <span>
                {rotuloTema(piorTema.categoria, piorTema.subcategoria)} está em{" "}
                {piorTema.aproveitamento}% de acerto ({piorTema.acertos} de{" "}
                {piorTema.respondidas} respostas, {piorTema.alunos} alunos).
              </span>
            </div>
          )}

          <div className="mb-4">
            <DesempenhoTemas
              linhas={temas}
              detalhe={(item) =>
                `${item.alunos ?? 0} alunos · ${item.partidas ?? 0} partidas`
              }
            />
          </div>
        </>
      )}

      {/* Alunos */}
      <div className="mb-3">
        <h5 className="text-white mb-1">Seus alunos</h5>

        <p className="text-light small mb-0">
          Todo mundo que já jogou uma sala sua, ordenado por pontos.
        </p>
      </div>

      <div className="card border-0" style={PAINEL}>
        <div className="card-body p-0 table-responsive">
          <table className="table table-dark table-borderless align-middle tabela-relatorio">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>#</th>
                <th>Aluno</th>
                <th className="text-end">Partidas</th>
                <th className="text-end">Pontos</th>
                <th style={{ minWidth: "150px" }}>Aproveitamento</th>
                <th className="text-end">Sequência</th>
                <th className="text-end">Última partida</th>
              </tr>
            </thead>

            <tbody>
              {alunos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-light py-4">
                    Nenhum aluno participou das suas salas ainda.
                  </td>
                </tr>
              ) : (
                alunos.map((aluno, indice) => (
                  <tr key={aluno.player_id}>
                    <td className="text-light fw-bold">
                      {MEDALHAS[indice] ?? `${indice + 1}º`}
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <AvatarInicial nome={aluno.nome} tamanho={32} />

                        <span className="text-white">{aluno.nome}</span>
                      </div>
                    </td>

                    <td className="text-end text-light">{aluno.partidas}</td>

                    <td className="text-end fw-bold text-white">
                      {aluno.pontos}
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <BarraAproveitamento
                            valor={aluno.aproveitamento}
                            altura={8}
                            legenda={`Aproveitamento de ${aluno.nome}`}
                          />
                        </div>

                        <span
                          className="small fw-bold"
                          style={{
                            color: corAproveitamento(aluno.aproveitamento),
                            minWidth: "38px",
                            textAlign: "right",
                          }}
                        >
                          {aluno.aproveitamento}%
                        </span>
                      </div>

                      <span className="small" style={{ color: CORES.apagado }}>
                        {aluno.acertos} de {aluno.respondidas} perguntas
                      </span>
                    </td>

                    <td className="text-end text-light">
                      🔥 {aluno.melhor_streak}
                    </td>

                    <td className="text-end text-light small">
                      {formatarData(aluno.ultima_em)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ResultadosProfessor;
