// src/pages/LoginPage.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UniverseBackground from "../components/UniverseBackground";
import { supabase } from "../lib/supabaseClient";

// Descomente quando criar o cliente do Supabase
// import { supabase } from "../services/supabase";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
  e.preventDefault();

  setErro("");

  if (!email || !senha) {
    setErro("Preencha e-mail e senha.");
    return;
  }

  try {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw error;

    navigate("/dashboard");
  } catch (err) {
    switch (err.message) {
      case "Invalid login credentials":
        setErro("E-mail ou senha inválidos.");
        break;

      case "Email not confirmed":
        setErro("Confirme seu e-mail antes de fazer login.");
        break;

      default:
        setErro(err.message);
    }
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

      <div className="container vh-100 d-flex justify-content-center align-items-center">
        <div
          className="card shadow-lg p-4"
          style={{
            width: "430px",
            borderRadius: "20px",
            zIndex: 10,
            position: "relative",
          }}
        >
          <h2 className="text-center mb-2">Universus</h2>

          <p className="text-center text-secondary mb-4">
            Faça login para continuar
          </p>

          {erro && (
            <div className="alert alert-danger">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">E-mail</label>

              <input
                type="email"
                className="form-control"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Senha</label>

              <input
                type="password"
                className="form-control"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="text-center my-4">
            <span className="text-secondary">ou</span>
          </div>

          <button
            className="btn btn-outline-dark w-100"
            onClick={handleGoogleLogin}
          >
            <i className="fab fa-google me-2"></i>
            Entrar com Google
          </button>

          <hr />

          <p className="text-center mb-3">
            Ainda não possui uma conta?
          </p>

          <div className="d-grid gap-2">
            <Link
              to="/criar-conta?tipo=aluno"
              className="btn btn-outline-primary"
            >
              <i className="fas fa-user-graduate me-2"></i>
              Criar conta como Aluno
            </Link>

            <Link
              to="/criar-conta?tipo=professor"
              className="btn btn-outline-success"
            >
              <i className="fas fa-chalkboard-teacher me-2"></i>
              Criar conta como Professor
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;