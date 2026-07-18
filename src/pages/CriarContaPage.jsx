// src/pages/CriarContaPage.jsx

import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import UniverseBackground from "../components/UniverseBackground";
import { supabase } from "../lib/supabaseClient";


function CriarContaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tipo = searchParams.get("tipo") || "aluno";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCadastro(e) {
  e.preventDefault();

  setErro("");

  if (!nome || !email || !senha || !confirmarSenha) {
    setErro("Preencha todos os campos.");
    return;
  }

  if (senha !== confirmarSenha) {
    setErro("As senhas não coincidem.");
    return;
  }

  if (senha.length < 6) {
    setErro("A senha deve possuir pelo menos 6 caracteres.");
    return;
  }

  try {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
          tipo,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;

    if (!data.session) {
      alert("Conta criada! Verifique seu e-mail para confirmar a conta.");
      navigate("/");
      return;
    }

    navigate("/dashboard");
  } catch (err) {
    setErro(err.message);
  } finally {
    setLoading(false);
  }
}

  async function handleGoogleLogin() {
  try {
    setErro("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;
  } catch (err) {
    setErro(err.message);
  }
}

  return (
    <>
      <UniverseBackground />

      <div className="container-fluid vh-100 d-flex justify-content-center align-items-center">
        <div
          className="card shadow-lg p-4"
          style={{
            width: "430px",
            borderRadius: "20px",
            backdropFilter: "blur(10px)",
            zIndex: 10,
            position: "relative",
          }}
        >
          <h2 className="text-center mb-2">
            {tipo === "professor"
              ? "Cadastro de Professor"
              : "Cadastro de Aluno"}
          </h2>

          <p className="text-center text-secondary mb-4">
            Crie sua conta no Universus
          </p>

          {erro && (
            <div className="alert alert-danger">
              {erro}
            </div>
          )}

          <form onSubmit={handleCadastro}>
            <div className="mb-3">
              <label className="form-label">
                Nome
              </label>

              <input
                className="form-control"
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                E-mail
              </label>

              <input
                className="form-control"
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Senha
              </label>

              <input
                className="form-control"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">
                Confirmar senha
              </label>

              <input
                className="form-control"
                type="password"
                placeholder="Repita sua senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
              />
            </div>

            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Criando conta..."
                : `Criar conta como ${
                    tipo === "professor"
                      ? "Professor"
                      : "Aluno"
                  }`}
            </button>
          </form>

          <div className="text-center my-4">
            <span className="text-secondary">
              ou
            </span>
          </div>

          <button
            className="btn btn-outline-dark w-100"
            onClick={handleGoogleLogin}
          >
            <i className="fab fa-google me-2"></i>
            Continuar com Google
          </button>

          <hr />

          <p className="text-center mb-0">
            Já possui uma conta?
          </p>

          <Link
            to="/"
            className="btn btn-outline-primary w-100 mt-3"
          >
            Entrar
          </Link>
        </div>
      </div>
    </>
  );
}

export default CriarContaPage;