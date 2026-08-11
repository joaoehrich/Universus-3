// src/pages/TemasPage.jsx
//
// Aproveitamento do aluno agrupado por materia, com os assuntos dentro. Do
// pior para o melhor: o que precisa de estudo aparece primeiro.

import { useEffect, useState } from "react";
import { usePerfil } from "../hooks/usePerfil";
import { formatarData, meuDesempenhoPorTema } from "../lib/relatorios";
import DesempenhoTemas from "../components/resultados/DesempenhoTemas";
import CartaoKpi from "../components/ui/CartaoKpi";
import EstadoVazio from "../components/ui/EstadoVazio";
import {
  CORES,
  corAproveitamento,
  percentual,
  rotuloTema,
} from "../components/ui/formato";
import "../styles/relatorios.css";

function TemasPage() {
  const { perfil } = usePerfil();

  const [temas, setTemas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let ativo = true;

    async function carregar() {
      try {
        const dados = await meuDesempenhoPorTema(perfil.id);

        if (!ativo) return;

        setTemas(dados ?? []);
        setErro("");
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

  const respondidas = temas.reduce(
    (total, tema) => total + (tema.respondidas ?? 0),
    0
  );

  const acertos = temas.reduce((total, tema) => total + (tema.acertos ?? 0), 0);

  const geral = percentual(acertos, respondidas);

  const ordenados = [...temas].sort(
    (a, b) => (a.aproveitamento ?? 0) - (b.aproveitamento ?? 0)
  );

  const maisFraco = ordenados[0];
  const maisForte = ordenados[ordenados.length - 1];

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="display-6 fw-bold text-white mb-1">Meus Temas 🎯</h1>

        <p className="text-light mb-0">
          Seu aproveitamento em cada matéria e assunto. O que precisa de estudo
          vem primeiro.
        </p>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {carregando ? (
        <p className="text-light">Calculando seu desempenho...</p>
      ) : temas.length === 0 ? (
        <EstadoVazio
          icone="🔭"
          titulo="Nenhum tema para mostrar ainda"
          texto="Depois da sua primeira partida, seu desempenho por assunto aparece aqui."
          acao={{ para: "/dashboard/entrar-sala", texto: "🎮 Entrar em Sala" }}
        />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-4">
              <CartaoKpi
                icone="🎯"
                valor={`${geral}%`}
                rotulo="Aproveitamento geral"
                detalhe={`${acertos} de ${respondidas} perguntas`}
                cor={corAproveitamento(geral)}
              />
            </div>

            <div className="col-6 col-lg-4">
              <CartaoKpi
                icone="📚"
                valor={`${maisFraco.aproveitamento}%`}
                rotulo="Precisa de estudo"
                detalhe={rotuloTema(maisFraco.categoria, maisFraco.subcategoria)}
                cor={CORES.vermelho}
              />
            </div>

            <div className="col-6 col-lg-4">
              <CartaoKpi
                icone="💪"
                valor={`${maisForte.aproveitamento}%`}
                rotulo="Seu ponto forte"
                detalhe={rotuloTema(maisForte.categoria, maisForte.subcategoria)}
                cor={CORES.verde}
              />
            </div>
          </div>

          <DesempenhoTemas
            linhas={temas}
            detalhe={(item) =>
              item.ultima_em ? `última em ${formatarData(item.ultima_em)}` : ""
            }
          />
        </>
      )}
    </div>
  );
}

export default TemasPage;
