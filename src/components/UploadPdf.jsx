// src/components/UploadPdf.jsx

import { useRef, useState } from "react";
import { gerarQuestoesDoPdf, validarPdf } from "../lib/gerarQuestoes";

function UploadPdf({ dificuldade, categoria, onQuestoesGeradas, vagas = 10 }) {
  const inputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [quantidade, setQuantidade] = useState(5);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  function selecionarArquivo(e) {
    const escolhido = e.target.files?.[0] ?? null;

    setErro(validarPdf(escolhido));
    setAviso("");
    setArquivo(escolhido);
  }

  function limpar() {
    setArquivo(null);
    setErro("");
    setAviso("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function gerar() {
    setErro("");
    setAviso("");

    try {
      setCarregando(true);

      const questoes = await gerarQuestoesDoPdf({
        arquivo,
        quantidade,
        dificuldade,
        categoria,
      });

      const aproveitadas = onQuestoesGeradas(questoes);

      limpar();

      setAviso(
        aproveitadas < questoes.length
          ? `${aproveitadas} de ${questoes.length} questões adicionadas (limite de 10 perguntas).`
          : `${aproveitadas} ${aproveitadas === 1 ? "questão adicionada" : "questões adicionadas"} ao quiz.`
      );
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const semVagas = vagas <= 0;

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
        <h4 className="mb-1 text-white">
          📄 Gerar perguntas a partir de um PDF
        </h4>

        <p className="text-light mb-4">
          Envie o material de estudo e a IA monta as perguntas para você.
        </p>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {aviso && <div className="alert alert-success">{aviso}</div>}

        <div className="row g-3 align-items-end">
          <div className="col-md-7">
            <label className="form-label">Arquivo PDF (até 10 MB)</label>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="form-control"
              onChange={selecionarArquivo}
              disabled={carregando || semVagas}
            />
          </div>

          <div className="col-md-3">
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

          <div className="col-md-2 d-grid">
            <button
              type="button"
              className="btn"
              style={{
                background: "#7C3AED",
                color: "#fff",
                border: "none",
              }}
              onClick={gerar}
              disabled={!arquivo || !!erro || carregando || semVagas}
            >
              {carregando ? "Gerando..." : "Gerar"}
            </button>
          </div>
        </div>

        {semVagas && (
          <p className="text-light mt-3 mb-0">
            O quiz já está com 10 perguntas. Remova alguma para gerar novas.
          </p>
        )}

        {carregando && (
          <p className="text-light mt-3 mb-0">
            Lendo o PDF e criando as perguntas. Isso pode levar alguns
            segundos...
          </p>
        )}
      </div>
    </div>
  );
}

export default UploadPdf;
