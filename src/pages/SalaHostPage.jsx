// src/pages/SalaHostPage.jsx
//
// Painel do anfitriao: e esta tela que o professor projeta. Ela mostra o
// codigo do lobby, conduz pergunta a pergunta e fecha a partida.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePerfil } from "../hooks/usePerfil";
import { useSala } from "../hooks/useSala";
import BarraTempo from "../components/partida/BarraTempo";
import CartaoAlternativa from "../components/partida/CartaoAlternativa";
import Placar from "../components/partida/Placar";
import {
  buscarSalaPorCodigo,
  contarRespostas,
  encerrarPartida,
  iniciarPartida,
  perguntaDaSala,
  proximaPergunta,
  revelarResposta,
} from "../lib/partida";

import "../styles/partida.css";

function SalaHostPage() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfil();

  const [salaId, setSalaId] = useState(null);
  const [perguntaEstado, setPerguntaEstado] = useState(null);
  const [contagem, setContagem] = useState(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { sala, jogadores, carregando } = useSala(salaId);

  const estado = sala?.estado;
  const indice = sala?.pergunta_index ?? 0;

  // Guardamos os dados junto com o índice a que pertencem. Assim uma
  // pergunta nova já nasce limpa, sem precisar zerar nada em efeito.
  const pergunta = perguntaEstado?.indice === indice ? perguntaEstado.dados : null;
  const respondidos = contagem?.indice === indice ? contagem.total : 0;

  // Usado dentro do intervalo de contagem sem re-criar o intervalo toda
  // vez que alguém pontua.
  const totalJogadores = useRef(0);

  useEffect(() => {
    totalJogadores.current = jogadores.length;
  }, [jogadores.length]);

  // Descobre o id da sala a partir do codigo da URL.
  useEffect(() => {
    let ativo = true;

    buscarSalaPorCodigo(codigo)
      .then((encontrada) => {
        if (!ativo) return;

        if (!encontrada) {
          setErro("Sala não encontrada. Confira o código.");
          return;
        }

        setSalaId(encontrada.id);
      })
      .catch((err) => ativo && setErro(err.message));

    return () => {
      ativo = false;
    };
  }, [codigo]);

  const revelar = useCallback(async () => {
    if (!salaId) return;

    try {
      await revelarResposta(salaId);
    } catch (err) {
      setErro(err.message);
    }
  }, [salaId]);

  // Recarrega a pergunta sempre que o estado ou o índice mudam.
  useEffect(() => {
    if (!salaId || !estado || estado === "lobby" || estado === "encerrada") return;

    let ativo = true;
    const alvo = indice;

    perguntaDaSala(salaId)
      .then((dados) => ativo && setPerguntaEstado({ indice: alvo, dados }))
      .catch((err) => ativo && setErro(err.message));

    return () => {
      ativo = false;
    };
  }, [salaId, estado, indice]);

  // Quantos alunos já responderam a pergunta que está no ar. Quando a
  // turma inteira responde não faz sentido esperar o cronômetro.
  useEffect(() => {
    if (!salaId || estado !== "pergunta") return;

    let ativo = true;
    const alvo = indice;

    async function contar() {
      try {
        const total = await contarRespostas(salaId, alvo);

        if (!ativo) return;

        setContagem({ indice: alvo, total });

        if (total > 0 && total >= totalJogadores.current) {
          await revelar();
        }
      } catch {
        // Um erro de contagem não pode derrubar a partida.
      }
    }

    contar();

    const relogio = setInterval(contar, 1500);

    return () => {
      ativo = false;
      clearInterval(relogio);
    };
  }, [salaId, estado, indice, revelar]);

  async function executar(acao) {
    try {
      setErro("");
      setOcupado(true);

      await acao();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function copiarCodigo() {
    navigator.clipboard?.writeText(codigo.toUpperCase());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (erro && !sala) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{erro}</div>

        <button className="partida-botao" onClick={() => navigate("/dashboard/salas")}>
          Voltar para Salas
        </button>
      </div>
    );
  }

  if (carregando || !sala) {
    return <p className="text-light">Carregando sala...</p>;
  }

  if (perfil && sala.host_id !== perfil.id) {
    return (
      <div className="container-fluid">
        <div className="partida-painel p-5 text-center">
          <h3>Essa sala é de outro anfitrião</h3>

          <p className="text-light">
            Para participar como jogador, entre pelo código.
          </p>

          <button
            className="partida-botao"
            onClick={() => navigate(`/dashboard/jogar/${codigo}`)}
          >
            Entrar como jogador
          </button>
        </div>
      </div>
    );
  }

  const ultimaPergunta = indice + 1 >= (sala.total_perguntas ?? 0);

  return (
    <div className="container-fluid">
      {erro && <div className="alert alert-danger">{erro}</div>}

      {/* Cabeçalho fixo da partida */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold text-white mb-1">
            {sala.quizzes?.title ?? "Partida"}
          </h1>

          <p className="text-light mb-0">
            {estado === "lobby"
              ? "Aguardando jogadores"
              : estado === "encerrada"
              ? "Partida encerrada"
              : `Pergunta ${indice + 1} de ${sala.total_perguntas}`}
          </p>
        </div>

        <div className="d-flex align-items-center gap-3">
          <span className="partida-painel px-3 py-2">
            👥 <strong>{jogadores.length}</strong> jogadores
          </span>

          {estado !== "lobby" && estado !== "encerrada" && (
            <span className="partida-painel px-3 py-2">
              ✍️ <strong>{respondidos}</strong> responderam
            </span>
          )}
        </div>
      </div>

      {/* ---------------- LOBBY ---------------- */}
      {estado === "lobby" && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="partida-painel-forte p-5 text-center h-100">
              <p className="text-light text-uppercase fw-semibold mb-3">
                Código da sala
              </p>

              <div className="partida-codigo-caixa d-inline-block mb-3">
                <div className="partida-codigo">{sala.codigo}</div>
              </div>

              <p className="text-light">
                Peça para a turma entrar em <strong>Entrar em Sala</strong> e
                digitar esse código.
              </p>

              <button className="partida-botao partida-botao-claro" onClick={copiarCodigo}>
                {copiado ? "✅ Copiado!" : "📋 Copiar código"}
              </button>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="partida-painel p-4 h-100 d-flex flex-column">
              <h4 className="mb-3">Na sala de espera</h4>

              {jogadores.length === 0 ? (
                <p className="text-light">
                  Ninguém entrou ainda. Assim que alguém digitar o código, o
                  nome aparece aqui.
                </p>
              ) : (
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {jogadores.map((jogador) => (
                    <span key={jogador.id} className="partida-jogador">
                      🚀 {jogador.nome}
                    </span>
                  ))}
                </div>
              )}

              <button
                className="partida-botao mt-auto"
                disabled={ocupado || jogadores.length === 0}
                onClick={() => executar(() => iniciarPartida(salaId))}
              >
                {jogadores.length === 0
                  ? "Esperando jogadores..."
                  : `▶️ Iniciar partida (${jogadores.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PERGUNTA / REVELAÇÃO ---------------- */}
      {(estado === "pergunta" || estado === "revelacao") && pergunta && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="partida-painel-forte p-4 mb-4">
              <BarraTempo
                key={pergunta.pergunta_id}
                iniciadaEm={pergunta.iniciada_em}
                tempo={pergunta.tempo}
                congelado={estado === "revelacao"}
                aoEsgotar={revelar}
              />
            </div>

            <div className="partida-painel-forte p-4 mb-4">
              <h2 className="text-white mb-0">{pergunta.enunciado}</h2>

              {pergunta.imagem_url && (
                <img
                  src={pergunta.imagem_url}
                  alt=""
                  className="mt-3 rounded"
                  style={{ maxHeight: "260px", margin: "0 auto" }}
                />
              )}
            </div>

            <div className="row g-3">
              {(pergunta.alternativas ?? []).map((alternativa, posicao) => (
                <div key={alternativa.id} className="col-md-6">
                  <CartaoAlternativa
                    alternativa={alternativa}
                    indice={posicao}
                    revelando={estado === "revelacao"}
                    desabilitada
                  />
                </div>
              ))}
            </div>

            {estado === "revelacao" && pergunta.explicacao && (
              <div className="partida-painel p-4 mt-4">
                <h5 className="mb-2">💡 Por quê?</h5>

                <p className="text-light mb-0">{pergunta.explicacao}</p>
              </div>
            )}

            <div className="d-flex flex-wrap gap-3 mt-4">
              {estado === "pergunta" ? (
                <button
                  className="partida-botao"
                  disabled={ocupado}
                  onClick={() => executar(revelar)}
                >
                  👀 Revelar resposta
                </button>
              ) : (
                <button
                  className="partida-botao"
                  disabled={ocupado}
                  onClick={() => executar(() => proximaPergunta(salaId))}
                >
                  {ultimaPergunta ? "🏁 Ver resultado final" : "➡️ Próxima pergunta"}
                </button>
              )}

              <button
                className="partida-botao partida-botao-claro"
                disabled={ocupado}
                onClick={() => executar(() => encerrarPartida(salaId))}
              >
                Encerrar partida
              </button>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="partida-painel p-4 h-100">
              <h4 className="mb-3">Placar ao vivo</h4>

              <Placar jogadores={jogadores} />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RESULTADO FINAL ---------------- */}
      {estado === "encerrada" && (
        <div className="row g-4">
          <div className="col-lg-12">
            <div className="partida-painel-forte p-5 text-center">
              <h2 className="mb-1">🏆 Fim de partida!</h2>

              <p className="text-light">
                Os pontos já viraram XP no perfil de cada jogador.
              </p>

              {jogadores[0] && (
                <div className="partida-numerao mt-4" style={{ color: "#F59E0B" }}>
                  🥇 {jogadores[0].nome}
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-8 mx-auto">
            <div className="partida-painel p-4">
              <h4 className="mb-3">Classificação final</h4>

              <Placar jogadores={jogadores} />

              <button
                className="partida-botao w-100 mt-4"
                onClick={() => navigate("/dashboard/salas")}
              >
                Voltar para Salas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaHostPage;
