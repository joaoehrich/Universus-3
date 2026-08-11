// src/pages/DetalheSalaProfessorPage.jsx
//
// Detalhe de uma sala para o professor: placar final e o desempenho pergunta
// a pergunta. E aqui que ele descobre qual questao derrubou a turma.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { detalheSalaProfessor } from "../lib/professor";
import { formatarData } from "../lib/relatorios";
import CartaoKpi from "../components/ui/CartaoKpi";
import BarraAproveitamento from "../components/ui/BarraAproveitamento";
import AvatarInicial from "../components/ui/AvatarInicial";
import CartaoPergunta from "../components/resultados/CartaoPergunta";
import {
  PAINEL,
  CORES,
  MEDALHAS,
  corAproveitamento,
  percentual,
  rotuloTema,
} from "../components/ui/formato";
import "../styles/relatorios.css";

function DetalheSalaProfessorPage() {
  const { salaId } = useParams();

  const [detalhe, setDetalhe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setErro("");

        const dados = await detalheSalaProfessor(salaId);

        if (!ativo) return;

        setDetalhe(dados);
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
  }, [salaId]);

  if (carregando) {
    return <p className="text-light">Carregando a partida...</p>;
  }

  if (erro || !detalhe) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          {erro || "Partida não encontrada."}
        </div>

        <Link to="/dashboard/resultados" className="btn btn-outline-light">
          ← Voltar aos resultados
        </Link>
      </div>
    );
  }

  const { sala, jogadores = [], perguntas = [] } = detalhe;

  const respondidas = jogadores.reduce(
    (total, jogador) => total + (jogador.respondidas ?? 0),
    0
  );

  const acertos = jogadores.reduce(
    (total, jogador) => total + (jogador.acertos ?? 0),
    0
  );

  const aproveitamento = percentual(acertos, respondidas);

  const mediaPontos =
    jogadores.length > 0
      ? Math.round(
          jogadores.reduce((total, jogador) => total + (jogador.pontos ?? 0), 0) /
            jogadores.length
        )
      : 0;

  // A pergunta com menor aproveitamento ganha destaque — so faz sentido
  // apontar uma vila quando existe mais de uma pergunta respondida.
  const respondidasNaSala = perguntas.filter((item) => item.respondidas > 0);

  const pior =
    respondidasNaSala.length > 1
      ? [...respondidasNaSala].sort(
          (a, b) => (a.aproveitamento ?? 0) - (b.aproveitamento ?? 0)
        )[0]
      : null;

  const encerrada = sala.estado === "encerrada";

  return (
    <div className="container-fluid">
      <Link
        to="/dashboard/resultados"
        className="btn btn-sm btn-outline-light mb-4"
      >
        ← Voltar aos resultados
      </Link>

      {/* Cabecalho da sala */}
      <div className="mb-4">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
          <h1 className="display-6 fw-bold text-white mb-0">
            {sala.quiz_titulo}
          </h1>

          <span
            className="badge"
            style={{
              background: encerrada
                ? "rgba(255,255,255,.12)"
                : "rgba(16,185,129,.25)",
              color: "#fff",
            }}
          >
            {encerrada ? "encerrada" : "ao vivo"}
          </span>
        </div>

        <p className="text-light mb-0">
          {rotuloTema(sala.categoria, sala.subcategoria)} · {sala.dificuldade} ·
          sala <strong>{sala.codigo}</strong> · {formatarData(sala.criada_em)}
        </p>
      </div>

      {!encerrada && (
        <div
          className="alert"
          style={{
            background: "rgba(245,158,11,.12)",
            border: "1px solid rgba(245,158,11,.4)",
            color: "#fff",
            borderRadius: "16px",
          }}
        >
          Essa partida ainda está em andamento — os números mudam até a sala
          ser encerrada.
        </div>
      )}

      {/* Resumo da sala */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="👥"
            valor={jogadores.length}
            rotulo="Participantes"
            cor={CORES.lilas}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="🎯"
            valor={`${aproveitamento}%`}
            rotulo="Aproveitamento da turma"
            detalhe={`${acertos} de ${respondidas} respostas`}
            cor={corAproveitamento(aproveitamento)}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="⭐"
            valor={mediaPontos}
            rotulo="Média de pontos"
            cor={CORES.azul}
          />
        </div>

        <div className="col-6 col-lg-3">
          <CartaoKpi
            icone="❓"
            valor={sala.total_perguntas}
            rotulo="Perguntas"
            cor={CORES.ambar}
          />
        </div>
      </div>

      {/* Placar final */}
      <h5 className="text-white mb-3">Placar</h5>

      <div className="card border-0 mb-4" style={PAINEL}>
        <div className="card-body p-0 table-responsive">
          <table className="table table-dark table-borderless align-middle tabela-relatorio">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>#</th>
                <th>Aluno</th>
                <th className="text-end">Pontos</th>
                <th style={{ minWidth: "150px" }}>Aproveitamento</th>
                <th className="text-end">Sequência</th>
              </tr>
            </thead>

            <tbody>
              {jogadores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-light py-4">
                    Ninguém entrou nessa sala.
                  </td>
                </tr>
              ) : (
                jogadores.map((jogador) => (
                  <tr key={jogador.player_id}>
                    <td className="text-light fw-bold">
                      {MEDALHAS[jogador.posicao - 1] ?? `${jogador.posicao}º`}
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <AvatarInicial nome={jogador.nome} tamanho={32} />

                        <span className="text-white">{jogador.nome}</span>
                      </div>
                    </td>

                    <td className="text-end fw-bold text-white">
                      {jogador.pontos}
                    </td>

                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="flex-grow-1">
                          <BarraAproveitamento
                            valor={jogador.aproveitamento}
                            altura={8}
                            legenda={`Aproveitamento de ${jogador.nome}`}
                          />
                        </div>

                        <span
                          className="small fw-bold"
                          style={{
                            color: corAproveitamento(jogador.aproveitamento),
                            minWidth: "38px",
                            textAlign: "right",
                          }}
                        >
                          {jogador.aproveitamento}%
                        </span>
                      </div>

                      <span className="small" style={{ color: CORES.apagado }}>
                        {jogador.acertos} de {jogador.respondidas} perguntas
                      </span>
                    </td>

                    <td className="text-end text-light">
                      🔥 {jogador.melhor_streak}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pergunta a pergunta */}
      <h5 className="text-white mb-1">Pergunta a pergunta</h5>

      <p className="text-light small mb-3">
        A barra de cada alternativa mostra para onde a turma foi; a verde é a
        resposta correta.
      </p>

      {perguntas.length === 0 ? (
        <div className="card border-0" style={PAINEL}>
          <div className="card-body text-center py-4">
            <p className="text-light mb-0">
              Nenhuma pergunta foi respondida nessa sala.
            </p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {perguntas.map((pergunta) => (
            <CartaoPergunta
              key={pergunta.pergunta_id}
              pergunta={pergunta}
              total={sala.total_perguntas}
              destaque={pior?.pergunta_id === pergunta.pergunta_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DetalheSalaProfessorPage;
