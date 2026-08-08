// src/pages/JogarPage.jsx
//
// Lado do aluno durante a partida: lobby, pergunta com cronômetro,
// revelação da resposta e o resultado final com o XP ganho.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";
import { useSala } from "../hooks/useSala";
import BarraTempo from "../components/partida/BarraTempo";
import CartaoAlternativa from "../components/partida/CartaoAlternativa";
import Placar from "../components/partida/Placar";
import SeloCombo from "../components/partida/SeloCombo";
import {
  entrarSala,
  nivelDoXp,
  perguntaDaSala,
  progressoDoNivel,
  responderPergunta,
  XP_POR_NIVEL,
  xpDaPartida,
} from "../lib/partida";

import "../styles/partida.css";

function JogarPage() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { perfil } = usePerfil();

  const [salaId, setSalaId] = useState(null);
  const [perguntaEstado, setPerguntaEstado] = useState(null);
  const [resposta, setResposta] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [xpInfo, setXpInfo] = useState(null);
  const [larguraXp, setLarguraXp] = useState(0);

  const { sala, jogadores, carregando } = useSala(salaId);

  const estado = sala?.estado;
  const indice = sala?.pergunta_index ?? 0;

  // Pergunta e resposta ficam guardadas junto com o índice a que
  // pertencem, então cada pergunta nova já começa com a folha limpa.
  const pergunta = perguntaEstado?.indice === indice ? perguntaEstado.dados : null;
  const escolhida = resposta?.indice === indice ? resposta.escolhida : null;
  const resultado = resposta?.indice === indice ? resposta.resultado : null;

  const eu = jogadores.find((jogador) => jogador.player_id === perfil?.id);
  const minhaPosicao = jogadores.findIndex(
    (jogador) => jogador.player_id === perfil?.id
  );

  // Entra na sala (ou volta para ela, se a página foi recarregada).
  useEffect(() => {
    let ativo = true;

    entrarSala(codigo)
      .then((dados) => ativo && setSalaId(dados.sala_id))
      .catch((err) => ativo && setErro(err.message));

    return () => {
      ativo = false;
    };
  }, [codigo]);

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

  const responder = useCallback(
    async (alternativaId) => {
      if (!salaId || escolhida || enviando) return;

      const alvo = indice;
      const marcada = alternativaId ?? "tempo-esgotado";

      try {
        setEnviando(true);
        setResposta({ indice: alvo, escolhida: marcada, resultado: null });

        const retorno = await responderPergunta(salaId, alternativaId);

        setResposta({ indice: alvo, escolhida: marcada, resultado: retorno });
      } catch (err) {
        // "já respondeu" e "não está aberta" são esperados em corrida com
        // o cronômetro; o resto vale mostrar.
        if (!/já respondeu|nao esta aberta|não está aberta/i.test(err.message)) {
          setErro(err.message);
        }
      } finally {
        setEnviando(false);
      }
    },
    [salaId, escolhida, enviando, indice]
  );

  // Não respondeu a tempo: registra a passada em branco para o professor
  // ver que a turma inteira já fechou a pergunta.
  const tempoEsgotado = useCallback(() => {
    if (escolhida) return;

    responder(null);
  }, [escolhida, responder]);

  // Ao encerrar, busca o XP já atualizado e anima a barra.
  const perfilId = perfil?.id;
  const jaBuscouXp = useRef(false);

  useEffect(() => {
    if (estado !== "encerrada" || !perfilId || jaBuscouXp.current) return;

    jaBuscouXp.current = true;

    let ativo = true;

    supabase
      .from("profiles")
      .select("xp, nivel")
      .eq("id", perfilId)
      .single()
      .then(({ data }) => {
        if (!ativo || !data) return;

        const ganho = xpDaPartida(eu?.pontos ?? 0);
        const antes = Math.max(0, data.xp - ganho);

        setXpInfo({ ganho, antes, depois: data.xp, nivel: data.nivel });
        setLarguraXp(progressoDoNivel(antes) * 100);

        setTimeout(() => {
          if (ativo) setLarguraXp(progressoDoNivel(data.xp) * 100);
        }, 400);
      });

    return () => {
      ativo = false;
    };
  }, [estado, perfilId, eu?.pontos]);

  if (erro && !sala) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{erro}</div>

        <button className="partida-botao" onClick={() => navigate("/dashboard/entrar-sala")}>
          Tentar outro código
        </button>
      </div>
    );
  }

  if (carregando || !sala) {
    return <p className="text-light">Entrando na sala...</p>;
  }

  const revelando = estado === "revelacao";

  return (
    <div className="container-fluid">
      {erro && <div className="alert alert-danger">{erro}</div>}

      {/* ---------------- LOBBY ---------------- */}
      {estado === "lobby" && (
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="partida-painel-forte p-5 text-center">
              <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🛸</div>

              <h1 className="h2 fw-bold text-white mt-3 mb-2">
                Você está na sala!
              </h1>

              <p className="text-light mb-4">
                {sala.quizzes?.title} · {sala.total_perguntas} perguntas
              </p>

              <div className="partida-codigo-caixa d-inline-block mb-4">
                <div className="partida-codigo">{sala.codigo}</div>
              </div>

              <p className="text-light">
                Aguardando o professor iniciar a partida...
              </p>

              <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
                {jogadores.map((jogador) => (
                  <span key={jogador.id} className="partida-jogador">
                    {jogador.player_id === perfil?.id ? "⭐" : "🚀"} {jogador.nome}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PERGUNTA / REVELAÇÃO ---------------- */}
      {(estado === "pergunta" || revelando) && pergunta && (
        <div className="row g-4">
          <div className="col-lg-8">
            {/* Faixa de status: pergunta, pontos e combo */}
            <div className="partida-painel px-4 py-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <span className="text-light fw-semibold">
                Pergunta {indice + 1} de {sala.total_perguntas}
              </span>

              <div className="d-flex align-items-center gap-3">
                <SeloCombo streak={eu?.streak ?? 0} />

                <span className="fw-bold text-white" style={{ fontSize: "1.2rem" }}>
                  {eu?.pontos ?? 0} pts
                </span>
              </div>
            </div>

            <div className="partida-painel-forte p-4 mb-4">
              <BarraTempo
                key={pergunta.pergunta_id}
                iniciadaEm={pergunta.iniciada_em}
                tempo={pergunta.tempo}
                congelado={revelando || Boolean(escolhida)}
                aoEsgotar={tempoEsgotado}
              />
            </div>

            <div className="partida-painel-forte p-4 mb-4">
              <h2 className="text-white mb-0">{pergunta.enunciado}</h2>

              {pergunta.imagem_url && (
                <img
                  src={pergunta.imagem_url}
                  alt=""
                  className="mt-3 rounded"
                  style={{ maxHeight: "240px", margin: "0 auto" }}
                />
              )}
            </div>

            <div className="row g-3">
              {(pergunta.alternativas ?? []).map((alternativa, posicao) => (
                <div key={alternativa.id} className="col-md-6">
                  <CartaoAlternativa
                    alternativa={alternativa}
                    indice={posicao}
                    escolhida={escolhida === alternativa.id}
                    revelando={revelando}
                    desabilitada={Boolean(escolhida) || revelando || enviando}
                    aoEscolher={(alvo) => responder(alvo.id)}
                  />
                </div>
              ))}
            </div>

            {/* Feedback: só conta o resultado depois que o professor revela */}
            {escolhida && !revelando && (
              <div className="partida-painel p-4 mt-4 text-center partida-pontos-ganhos">
                <h5 className="mb-1">
                  {escolhida === "tempo-esgotado"
                    ? "⏰ Tempo esgotado"
                    : "✅ Resposta enviada!"}
                </h5>

                <p className="text-light mb-0">
                  Aguardando os outros jogadores...
                </p>
              </div>
            )}

            {revelando && (
              <div
                className="partida-painel p-4 mt-4 partida-pontos-ganhos"
                style={{
                  border: `1px solid ${
                    resultado?.correta ? "rgba(16,185,129,.5)" : "rgba(239,68,68,.4)"
                  }`,
                }}
              >
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <h4 className="mb-1">
                      {resultado?.correta ? "🎯 Acertou!" : "❌ Não foi dessa vez"}
                    </h4>

                    {resultado?.correta && (
                      <p className="text-light mb-0 small">
                        100 base + {resultado.bonus_tempo} de velocidade ×{" "}
                        {Number(resultado.multiplicador).toFixed(1)} de combo
                      </p>
                    )}
                  </div>

                  <div
                    className="partida-numerao"
                    style={{ color: resultado?.correta ? "#10B981" : "rgba(255,255,255,.35)" }}
                  >
                    +{resultado?.pontos ?? 0}
                  </div>
                </div>

                {pergunta.explicacao && (
                  <p className="text-light mb-0 mt-3">💡 {pergunta.explicacao}</p>
                )}
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="partida-painel p-4 h-100">
              <h4 className="mb-3">Placar</h4>

              <Placar jogadores={jogadores} meuId={perfil?.id} limite={10} />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RESULTADO FINAL ---------------- */}
      {estado === "encerrada" && (
        <div className="row justify-content-center g-4">
          <div className="col-lg-8">
            <div className="partida-painel-forte p-5 text-center">
              <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>
                {minhaPosicao === 0 ? "🏆" : minhaPosicao === 1 ? "🥈" : minhaPosicao === 2 ? "🥉" : "🎉"}
              </div>

              <h1 className="h2 fw-bold text-white mt-3 mb-1">
                {minhaPosicao >= 0
                  ? `${minhaPosicao + 1}º lugar`
                  : "Partida encerrada"}
              </h1>

              <p className="text-light mb-4">{sala.quizzes?.title}</p>

              <div className="row g-3 text-center mb-4">
                <div className="col-4">
                  <div className="partida-painel p-3">
                    <div className="partida-numerao" style={{ color: "#7C3AED" }}>
                      {eu?.pontos ?? 0}
                    </div>

                    <p className="text-light small mb-0 mt-2">pontos</p>
                  </div>
                </div>

                <div className="col-4">
                  <div className="partida-painel p-3">
                    <div className="partida-numerao" style={{ color: "#10B981" }}>
                      {eu?.acertos ?? 0}/{sala.total_perguntas}
                    </div>

                    <p className="text-light small mb-0 mt-2">acertos</p>
                  </div>
                </div>

                <div className="col-4">
                  <div className="partida-painel p-3">
                    <div className="partida-numerao" style={{ color: "#F59E0B" }}>
                      🔥 {eu?.melhor_streak ?? 0}
                    </div>

                    <p className="text-light small mb-0 mt-2">melhor sequência</p>
                  </div>
                </div>
              </div>

              {/* Ganho de XP */}
              <div className="partida-painel p-4 text-start">
                <div className="d-flex justify-content-between align-items-end mb-2">
                  <strong className="text-white">
                    Nível {xpInfo?.nivel ?? nivelDoXp(xpInfo?.depois ?? 0)}
                  </strong>

                  <span className="text-warning fw-bold">
                    +{xpInfo?.ganho ?? xpDaPartida(eu?.pontos ?? 0)} XP
                  </span>
                </div>

                <div className="partida-xp">
                  <div
                    className="partida-xp-preenchimento"
                    style={{ width: `${larguraXp}%` }}
                  />
                </div>

                <p className="text-light small mb-0 mt-2">
                  {xpInfo
                    ? `${xpInfo.depois % XP_POR_NIVEL} / ${XP_POR_NIVEL} XP para o próximo nível`
                    : "Calculando XP..."}
                </p>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="partida-painel p-4">
              <h4 className="mb-3">Classificação final</h4>

              <Placar jogadores={jogadores} meuId={perfil?.id} />

              <div className="d-flex gap-3 mt-4">
                <button
                  className="partida-botao flex-grow-1"
                  onClick={() => navigate("/dashboard/entrar-sala")}
                >
                  🎮 Jogar outra
                </button>

                <button
                  className="partida-botao partida-botao-claro flex-grow-1"
                  onClick={() => navigate("/dashboard/ranking")}
                >
                  🏆 Ver ranking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JogarPage;
