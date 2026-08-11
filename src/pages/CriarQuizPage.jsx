// src/pages/CriarQuizPage.jsx

import { useEffect, useState } from "react";
import UploadPdf from "../components/UploadPdf";
import { supabase } from "../lib/supabaseClient";
import { MATERIAS, catalogoCategorias } from "../lib/ranking";
import {
  subcategoriasDaCategoria,
  unirCategorias,
} from "../components/ui/formato";

const LIMITE_PERGUNTAS = 10;

// Um <datalist> so: as sugestoes mudam com a materia escolhida, e todas as
// perguntas do quiz pertencem a mesma materia.
const LISTA_SUBCATEGORIAS = "sugestoes-subcategoria";

// A, B, C, D, E. O banco guarda alternativas como linhas, então o número
// aqui é só o teto do formulário; as que ficarem em branco são descartadas
// na hora de salvar.
const MAX_ALTERNATIVAS = 5;

const LETRAS = ["A", "B", "C", "D", "E"];

function perguntaEmBranco() {
  return {
    pergunta: "",
    // `correta` começa nula de propósito: marcar a letra A por padrão faria
    // um quiz salvar com gabarito errado quando o professor esquecesse de
    // escolher. Sem resposta, o salvamento avisa em vez de aceitar calado.
    alternativas: Array(MAX_ALTERNATIVAS).fill(""),
    correta: null,
    // Vazia = a pergunta herda a subcategoria do quiz.
    subcategoria: "",
  };
}

const QUIZ_EM_BRANCO = {
  titulo: "",
  categoria: "",
  subcategoria: "",
  descricao: "",
  dificuldade: "Fácil",
  tempo: 30,
  visibilidade: "privado",
};

function CriarQuizPage() {
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [quiz, setQuiz] = useState(QUIZ_EM_BRANCO);

  const [perguntas, setPerguntas] = useState([perguntaEmBranco()]);

  // Catalogo do que ja existe no sistema, para sugerir subcategorias que
  // outros professores usaram em vez de cada um inventar a sua.
  const [catalogo, setCatalogo] = useState([]);

  useEffect(() => {
    let ativo = true;

    catalogoCategorias()
      .then((dados) => {
        if (ativo) setCatalogo(dados ?? []);
      })
      .catch(() => {
        // Sem catalogo o formulário continua funcionando com as sugestões
        // fixas de MATERIAS: não vale travar a tela por causa disso.
        if (ativo) setCatalogo([]);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const categorias = unirCategorias(catalogo, MATERIAS);

  const sugestoesSubcategoria = subcategoriasDaCategoria(
    quiz.categoria,
    catalogo,
    MATERIAS
  );

  function atualizarPergunta(index, valor) {
    const lista = [...perguntas];
    lista[index].pergunta = valor;
    setPerguntas(lista);
  }

  function atualizarSubcategoriaDaPergunta(index, valor) {
    const lista = [...perguntas];
    lista[index].subcategoria = valor;
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

  function perguntaVazia(item) {
    return (
      !item.pergunta.trim() &&
      item.alternativas.every((alt) => !alt.trim())
    );
  }

  // Deixa as perguntas prontas para o banco: descarta alternativas em branco
  // (o formulário sempre mostra 5 campos, mas a questão pode usar só 3) e
  // recalcula o índice da correta, que muda quando um campo do meio some.
  function prepararPerguntas(lista) {
    const prontas = [];
    const erros = [];

    lista.forEach((item, indice) => {
      const numero = indice + 1;
      const alternativas = [];

      let correta = -1;

      item.alternativas.forEach((alt, i) => {
        if (!alt.trim()) return;

        if (i === item.correta) {
          correta = alternativas.length;
        }

        alternativas.push(alt.trim());
      });

      if (!item.pergunta.trim()) {
        erros.push(`Pergunta ${numero}: falta o enunciado.`);
        return;
      }

      if (alternativas.length < 2) {
        erros.push(`Pergunta ${numero}: preencha pelo menos 2 alternativas.`);
        return;
      }

      if (correta === -1) {
        erros.push(`Pergunta ${numero}: marque qual alternativa é a correta.`);
        return;
      }

      prontas.push({
        pergunta: item.pergunta.trim(),
        alternativas,
        correta,
        // Sem subcategoria propria, o back-end herda a do quiz.
        subcategoria: item.subcategoria?.trim() || null,
      });
    });

    return { prontas, erros };
  }

  // Recebe as perguntas vindas do PDF. Se o formulário ainda estiver em
  // branco, substitui; caso contrário, acrescenta ao que já foi digitado.
  // Devolve quantas couberam dentro do limite de perguntas.
  function aplicarQuestoesGeradas(questoes) {
    const atuais = perguntas.every(perguntaVazia) ? [] : perguntas;
    const vagas = LIMITE_PERGUNTAS - atuais.length;
    const novas = questoes.slice(0, vagas);

    setPerguntas([
      ...atuais,
      ...novas.map((questao) => {
        // O PDF pode trazer menos de 5 alternativas; o restante fica em
        // branco para o professor completar ou deixar de fora.
        const alternativas = Array(MAX_ALTERNATIVAS).fill("");

        questao.alternativas
          .slice(0, MAX_ALTERNATIVAS)
          .forEach((texto, i) => {
            alternativas[i] = texto;
          });

        return {
          pergunta: questao.pergunta,
          alternativas,
          correta: questao.correta,
          subcategoria: "",
        };
      }),
    ]);

    return novas.length;
  }

  function adicionarPergunta() {
    if (perguntas.length >= LIMITE_PERGUNTAS) {
      alert(`Limite máximo de ${LIMITE_PERGUNTAS} perguntas.`);
      return;
    }

    setPerguntas([...perguntas, perguntaEmBranco()]);
  }

  function removerPergunta(index) {
    if (perguntas.length === 1) return;

    const lista = perguntas.filter((_, i) => i !== index);
    setPerguntas(lista);
  }

  async function salvarQuiz(e) {
    e.preventDefault();

    setErro("");
    setSucesso("");

    const preenchidas = perguntas.filter((item) => !perguntaVazia(item));

    if (preenchidas.length === 0) {
      setErro("Adicione pelo menos uma pergunta.");
      return;
    }

    const { prontas, erros } = prepararPerguntas(preenchidas);

    // Salvar pela metade deixaria o quiz com perguntas sem gabarito, que
    // quebram a partida na hora de pontuar. Melhor recusar e apontar onde.
    if (erros.length > 0) {
      setErro(erros.join(" "));
      return;
    }

    try {
      setSalvando(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErro("Sua sessão expirou. Entre novamente para salvar o quiz.");
        return;
      }

      // A função criar_quiz_completo grava quiz, perguntas, alternativas e o
      // vínculo entre eles numa única transação — se algo falhar, nada é salvo.
      const { data, error } = await supabase.rpc("criar_quiz_completo", {
        p_titulo: quiz.titulo,
        p_categoria: quiz.categoria,
        p_dificuldade: quiz.dificuldade,
        p_tempo: quiz.tempo,
        p_perguntas: prontas,
        // Descricao e subcategoria sao campos diferentes: antes a
        // subcategoria era enviada como descricao e sequestrava o campo.
        p_descricao: quiz.descricao.trim() || null,
        p_visibilidade: quiz.visibilidade,
        p_subcategoria: quiz.subcategoria.trim() || null,
      });

      if (error) throw error;

      const criado = Array.isArray(data) ? data[0] : data;

      setSucesso(
        `Quiz salvo! Código de acesso: ${criado?.access_code ?? "-"}`
      );

      setQuiz(QUIZ_EM_BRANCO);

      setPerguntas([perguntaEmBranco()]);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
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

              {erro && <div className="alert alert-danger">{erro}</div>}

              {sucesso && (
                <div className="alert alert-success">{sucesso}</div>
              )}

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
                        // Trocar a matéria limpa a subcategoria: senão sobra
                        // um par impossível, tipo "História · Potenciação".
                        setQuiz({
                          ...quiz,
                          categoria: e.target.value,
                          subcategoria: "",
                        })
                      }
                    >
                      <option value="">
                        Selecione
                      </option>

                      {categorias.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="quiz-subcategoria">
                      Subcategoria
                    </label>

                    {/* input + datalist: sugere o que já existe, mas deixa o
                        professor cadastrar um assunto novo. */}
                    <input
                      id="quiz-subcategoria"
                      className="form-control"
                      list={LISTA_SUBCATEGORIAS}
                      placeholder={
                        quiz.categoria
                          ? "Ex.: Potenciação"
                          : "Escolha a categoria primeiro"
                      }
                      disabled={!quiz.categoria}
                      value={quiz.subcategoria}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          subcategoria: e.target.value,
                        })
                      }
                    />

                    <datalist id={LISTA_SUBCATEGORIAS}>
                      {sugestoesSubcategoria.map((nome) => (
                        <option key={nome} value={nome} />
                      ))}
                    </datalist>

                    <div className="form-text text-light">
                      O assunto dentro da matéria. É por ele que o ranking e os
                      relatórios separam o desempenho.
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="quiz-descricao">
                      Descrição <span className="text-light">(opcional)</span>
                    </label>

                    <textarea
                      id="quiz-descricao"
                      className="form-control"
                      rows={2}
                      placeholder="Uma linha explicando do que se trata o quiz."
                      value={quiz.descricao}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          descricao: e.target.value,
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

                  <div className="col-md-6">
                    <label className="form-label">
                      Visibilidade
                    </label>

                    <select
                      className="form-select"
                      style={{
                        position: "relative",
                        zIndex: 9999,
                      }}
                      value={quiz.visibilidade}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          visibilidade: e.target.value,
                        })
                      }
                    >
                      <option value="privado">
                        Privado (só por código)
                      </option>

                      <option value="publico">
                        Público (aparece na pesquisa)
                      </option>
                    </select>
                  </div>
                </div>

                <UploadPdf
                  dificuldade={quiz.dificuldade}
                  categoria={quiz.categoria}
                  onQuestoesGeradas={aplicarQuestoesGeradas}
                  vagas={
                    perguntas.every(perguntaVazia)
                      ? LIMITE_PERGUNTAS
                      : LIMITE_PERGUNTAS - perguntas.length
                  }
                />

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

                      {/* Um quiz de Matemática pode misturar assuntos: aqui a
                          pergunta pode ter o seu. Em branco, herda a do quiz. */}
                      <input
                        className="form-control form-control-sm mb-3"
                        list={LISTA_SUBCATEGORIAS}
                        aria-label={`Subcategoria da pergunta ${indice + 1}`}
                        placeholder={
                          quiz.subcategoria
                            ? `Subcategoria (opcional — herda "${quiz.subcategoria}")`
                            : "Subcategoria da pergunta (opcional)"
                        }
                        value={item.subcategoria}
                        onChange={(e) =>
                          atualizarSubcategoriaDaPergunta(
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
                                name={`correta-${indice}`}
                                checked={item.correta === i}
                                onChange={() =>
                                  definirCorreta(indice, i)
                                }
                              />

                              <strong>{LETRAS[i]}</strong>

                              {item.correta === i
                                ? "✅ Correta"
                                : "⬜ Marcar"}
                            </label>
                          </div>

                          <input
                            className="form-control"
                            placeholder={`Alternativa ${LETRAS[i]}${
                              i >= 2 ? " (opcional)" : ""
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
                    disabled={perguntas.length >= LIMITE_PERGUNTAS}
                  >
                    ➕ Adicionar Pergunta (
                    {perguntas.length}/{LIMITE_PERGUNTAS})
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
                    disabled={salvando}
                  >
                    {salvando ? "Salvando..." : "Salvar Quiz"}
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