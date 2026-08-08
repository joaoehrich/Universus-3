// src/components/UploadPdf.jsx
//
// Dois jeitos de tirar perguntas de um PDF, na mesma tela:
//
//   "importar" — o PDF já traz as questões prontas (prova, lista de
//     exercícios). Lido no próprio navegador com o pdf.js: nada sai da
//     máquina do professor e não depende de nenhum serviço externo.
//
//   "ia" — o PDF é material de estudo e as questões são criadas pelo Gemini
//     (plano gratuito) na Edge Function `gerar-questoes`. Aqui o arquivo é
//     enviado para o Supabase.
//
// Os dois caminhos entregam o mesmo formato para o formulário do quiz.

import { useRef, useState } from "react";
import {
  extrairQuestoesDoPdf,
  validarPdf as validarPdfLocal,
} from "../lib/questoesPdf";
import {
  gerarQuestoesDoPdf,
  validarPdf as validarPdfIa,
} from "../lib/gerarQuestoes";
import { conferirAssinaturaPdf } from "../lib/arquivoPdf";

const MODOS = {
  importar: {
    titulo: "Questões prontas no PDF",
    ajuda: "O arquivo já tem as perguntas e alternativas.",
    limite: "até 20 MB",
    validar: validarPdfLocal,
    botao: ["Importar", "Lendo..."],
  },
  ia: {
    titulo: "Gerar com IA",
    ajuda: "O arquivo é material de estudo; a IA escreve as perguntas.",
    limite: "até 10 MB",
    validar: validarPdfIa,
    botao: ["Gerar", "Gerando..."],
  },
};

function UploadPdf({ dificuldade, categoria, onQuestoesGeradas, vagas = 10 }) {
  const inputRef = useRef(null);

  const [modo, setModo] = useState("importar");
  const [arquivo, setArquivo] = useState(null);
  const [quantidade, setQuantidade] = useState(5);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState("");
  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const config = MODOS[modo];

  function limparMensagens() {
    setErro("");
    setResumo("");
    setAvisos([]);
  }

  // Duas etapas: primeiro o que se sabe na hora (tipo e tamanho), depois a
  // assinatura, que exige ler o início do arquivo. A segunda só roda se a
  // primeira passar — não adianta ler um arquivo já recusado pelo tamanho.
  async function revalidar(escolhido, chaveModo) {
    const problema = MODOS[chaveModo].validar(escolhido);

    if (problema) {
      return problema;
    }

    return conferirAssinaturaPdf(escolhido);
  }

  async function trocarModo(novo) {
    setModo(novo);
    limparMensagens();

    // Os limites de tamanho diferem entre os modos: um arquivo aceito num
    // pode não passar no outro, então revalida o que já está selecionado.
    if (arquivo) {
      setErro(await revalidar(arquivo, novo));
    }
  }

  async function selecionarArquivo(e) {
    const escolhido = e.target.files?.[0] ?? null;

    limparMensagens();
    setArquivo(escolhido);
    setErro(await revalidar(escolhido, modo));
  }

  function limparArquivo() {
    setArquivo(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  // Parte comum aos dois modos: joga as questões no formulário e monta o
  // texto do resumo.
  function aplicar(questoes, verbo) {
    const aproveitadas = onQuestoesGeradas(questoes);

    limparArquivo();

    setResumo(
      aproveitadas < questoes.length
        ? `${aproveitadas} de ${questoes.length} questões ${verbo} (o quiz aceita no máximo 10).`
        : `${aproveitadas} ${
            aproveitadas === 1 ? "questão" : "questões"
          } ${verbo}.`
    );
  }

  async function executar() {
    limparMensagens();

    try {
      setCarregando(true);

      if (modo === "importar") {
        const { questoes, avisos: encontrados } = await extrairQuestoesDoPdf(
          arquivo
        );

        setAvisos(encontrados);

        if (questoes.length === 0) {
          setErro("Nenhuma questão pôde ser importada deste PDF.");
          return;
        }

        aplicar(questoes, "importadas do PDF");
        return;
      }

      const questoes = await gerarQuestoesDoPdf({
        arquivo,
        quantidade,
        alternativas: 5,
        dificuldade,
        categoria,
      });

      aplicar(questoes, "geradas pela IA");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const semVagas = vagas <= 0;
  const [rotulo, rotuloCarregando] = config.botao;

  return (
    <div
      className="card border-0 mb-5"
      style={{
        background: "rgba(124,58,237,.10)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: "16px",
      }}
    >
      <div className="card-body">
        <h4 className="mb-1 text-white">📄 Perguntas a partir de um PDF</h4>

        <p className="text-light mb-3">
          Escolha o que o seu arquivo é:
        </p>

        <div className="d-flex flex-wrap gap-2 mb-4">
          {Object.entries(MODOS).map(([chave, item]) => (
            <button
              key={chave}
              type="button"
              className="btn text-start"
              style={{
                background:
                  modo === chave ? "#7C3AED" : "rgba(255,255,255,.06)",
                color: "#fff",
                border:
                  modo === chave
                    ? "1px solid #7C3AED"
                    : "1px solid rgba(255,255,255,.15)",
                borderRadius: "12px",
                flex: "1 1 240px",
              }}
              onClick={() => trocarModo(chave)}
              disabled={carregando}
            >
              <strong className="d-block">{item.titulo}</strong>

              <small style={{ opacity: 0.85 }}>{item.ajuda}</small>
            </button>
          ))}
        </div>

        {modo === "importar" && (
          <p className="text-light mb-4">
            As questões precisam estar numeradas (1., 2., ...) com alternativas
            de <strong>a)</strong> a <strong>e)</strong>. A resposta correta é
            reconhecida como <em>“Resposta: C”</em> abaixo da questão, num bloco{" "}
            <em>GABARITO</em> no fim do arquivo, ou com <strong>*</strong> na
            alternativa certa.
          </p>
        )}

        {erro && <div className="alert alert-danger">{erro}</div>}

        {resumo && <div className="alert alert-success">{resumo}</div>}

        {avisos.length > 0 && (
          <div className="alert alert-warning">
            <strong>Confira estes pontos:</strong>

            <ul className="mb-0 mt-2">
              {avisos.map((aviso, i) => (
                <li key={i}>{aviso}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="row g-3 align-items-end">
          <div className={modo === "ia" ? "col-md-7" : "col-md-9"}>
            <label className="form-label">
              Arquivo PDF ({config.limite})
            </label>

            {/*
              O `.pdf` acompanha o MIME porque nem todo sistema mapeia a
              extensão para "application/pdf" — sem ele, em algumas máquinas o
              PDF simplesmente não aparece no diálogo de seleção.
            */}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="form-control"
              onChange={selecionarArquivo}
              disabled={carregando || semVagas}
            />
          </div>

          {modo === "ia" && (
            <div className="col-md-2">
              <label className="form-label">Quantidade</label>

              <select
                className="form-select"
                style={{ position: "relative", zIndex: 9999 }}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                disabled={carregando || semVagas}
              >
                {[3, 5, 8, 10].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor} perguntas
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-md-3 d-grid">
            <button
              type="button"
              className="btn"
              style={{
                background: "#7C3AED",
                color: "#fff",
                border: "none",
              }}
              onClick={executar}
              disabled={!arquivo || !!erro || carregando || semVagas}
            >
              {carregando ? rotuloCarregando : rotulo}
            </button>
          </div>
        </div>

        {semVagas && (
          <p className="text-light mt-3 mb-0">
            O quiz já está com 10 perguntas. Remova alguma para adicionar
            novas.
          </p>
        )}

        {carregando && (
          <p className="text-light mt-3 mb-0">
            {modo === "importar"
              ? "Lendo o PDF..."
              : "Enviando o PDF e criando as perguntas. Isso pode levar alguns segundos..."}
          </p>
        )}
      </div>
    </div>
  );
}

export default UploadPdf;
