// src/pages/CriarQuizPage.jsx

import { useState } from "react";

function CriarQuizPage() {
  const [quiz, setQuiz] = useState({
    titulo: "",
    categoria: "",
    subcategoria: "",
    dificuldade: "Fácil",
    tempo: 30,
  });

  const [perguntas, setPerguntas] = useState([
    {
      pergunta: "",
      alternativas: ["", "", "", ""],
      correta: 0,
    },
  ]);

  function atualizarPergunta(index, valor) {
    const lista = [...perguntas];
    lista[index].pergunta = valor;
    setPerguntas(lista);
  }

  function atualizarAlternativa(pergunta, alternativa, valor) {
    const lista = [...perguntas];
    lista[pergunta].alternativas[alternativa] = valor;
    setPerguntas(lista);
  }

  function definirCorreta(pergunta, alternativa) {
    const lista = [...perguntas];
    lista[pergunta].correta = alternativa;
    setPerguntas(lista);
  }

  function adicionarPergunta() {
    if (perguntas.length >= 10) {
      alert("Limite máximo de 10 perguntas.");
      return;
    }

    setPerguntas([
      ...perguntas,
      {
        pergunta: "",
        alternativas: ["", "", "", ""],
        correta: 0,
      },
    ]);
  }

  function removerPergunta(index) {
    if (perguntas.length === 1) return;

    const lista = perguntas.filter((_, i) => i !== index);
    setPerguntas(lista);
  }

  function salvarQuiz(e) {
    e.preventDefault();

    console.log({
      quiz,
      perguntas,
    });

    alert("Quiz salvo! (temporário)");
  }

  return (
    <div
      className="container-fluid"
      style={{
        paddingBottom: "120px",
      }}
    >
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div
            className="card border-0"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,.08)",
              overflow: "visible",
            }}
          >
            <div className="card-body p-5">
              <h2 className="fw-bold mb-1 text-white">
                🚀 Criar Quiz
              </h2>

              <p className="text-light mb-5">
                Configure seu quiz e adicione as perguntas.
              </p>

              <form onSubmit={salvarQuiz}>
                <div className="row g-3 mb-5">
                  <div className="col-md-6">
                    <label className="form-label">
                      Título
                    </label>

                    <input
                      className="form-control"
                      value={quiz.titulo}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          titulo: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Categoria
                    </label>

                    <select
                      className="form-select"
                      style={{
                        position: "relative",
                        zIndex: 9999,
                      }}
                      value={quiz.categoria}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          categoria: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Selecione
                      </option>
                      <option>Matemática</option>
                      <option>Português</option>
                      <option>História</option>
                      <option>Geografia</option>
                      <option>Ciências</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Subcategoria
                    </label>

                    <input
                      className="form-control"
                      value={quiz.subcategoria}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          subcategoria: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">
                      Dificuldade
                    </label>

                    <select
                      className="form-select"
                      style={{
                        position: "relative",
                        zIndex: 9999,
                      }}
                      value={quiz.dificuldade}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          dificuldade: e.target.value,
                        })
                      }
                    >
                      <option>Fácil</option>
                      <option>Médio</option>
                      <option>Difícil</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">
                      Tempo
                    </label>

                    <select
                      className="form-select"
                      style={{
                        position: "relative",
                        zIndex: 9999,
                      }}
                      value={quiz.tempo}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          tempo: Number(e.target.value),
                        })
                      }
                    >
                      <option value={15}>15 s</option>
                      <option value={30}>30 s</option>
                      <option value={45}>45 s</option>
                      <option value={60}>60 s</option>
                    </select>
                  </div>
                </div>

                {perguntas.map((item, indice) => (
                  <div
                    key={indice}
                    className="card border-0 mb-4"
                    style={{
                      background: "rgba(255,255,255,.03)",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      borderRadius: "16px",
                    }}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="mb-0 text-white">
                          Pergunta {indice + 1}
                        </h4>

                        {perguntas.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              removerPergunta(indice)
                            }
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <input
                        className="form-control mb-3"
                        placeholder="Digite a pergunta"
                        value={item.pergunta}
                        onChange={(e) =>
                          atualizarPergunta(
                            indice,
                            e.target.value
                          )
                        }
                      />

                      {item.alternativas.map((alt, i) => (
                        <div
                          key={i}
                          className="input-group mb-3"
                        >
                          <div
                            className="input-group-text"
                            style={{
                              minWidth: "140px",
                              background:
                                item.correta === i
                                  ? "rgba(34,197,94,.2)"
                                  : "rgba(255,255,255,.08)",
                              color: "#fff",
                            }}
                          >
                            <label
                              className="d-flex align-items-center gap-2 mb-0"
                              style={{ cursor: "pointer" }}
                            >
                              <input
                                type="radio"
                                checked={item.correta === i}
                                onChange={() =>
                                  definirCorreta(indice, i)
                                }
                              />

                              {item.correta === i
                                ? "✅ Resposta Correta"
                                : "⬜ Marcar Correta"}
                            </label>
                          </div>

                          <input
                            className="form-control"
                            placeholder={`Alternativa ${i + 1
                              }`}
                            value={alt}
                            onChange={(e) =>
                              atualizarAlternativa(
                                indice,
                                i,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mb-4">
                  <button
                    type="button"
                    className="btn btn-outline-light"
                    onClick={adicionarPergunta}
                    disabled={perguntas.length >= 10}
                  >
                    ➕ Adicionar Pergunta (
                    {perguntas.length}/10)
                  </button>
                </div>

                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-lg"
                    style={{
                      background: "#7C3AED",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    Salvar Quiz
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CriarQuizPage;