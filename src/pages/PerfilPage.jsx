// src/pages/PerfilPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";

function PerfilPage() {
  const { perfil, carregando, setPerfil } = usePerfil();

  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (perfil) setNome(perfil.name ?? "");
  }, [perfil]);

  async function salvar(e) {
    e.preventDefault();

    if (!perfil) return;

    if (!nome.trim()) {
      setErro("Informe seu nome.");
      return;
    }

    try {
      setErro("");
      setSucesso("");
      setSalvando(true);

      const { error } = await supabase
        .from("profiles")
        .update({ name: nome.trim() })
        .eq("id", perfil.id);

      if (error) throw error;

      setPerfil((atual) => (atual ? { ...atual, name: nome.trim() } : atual));

      setSucesso("Perfil atualizado!");
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-light">Carregando perfil...</p>;
  }

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <h1 className="display-6 fw-bold text-white mb-4">Meu Perfil 👤</h1>

          {erro && <div className="alert alert-danger">{erro}</div>}

          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          <div
            className="card border-0 mb-4"
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: "20px",
            }}
          >
            <div className="card-body p-4">
              <div className="row g-4 text-center mb-4">
                <div className="col-4">
                  <h3 className="text-white mb-0">{perfil?.xp ?? 0}</h3>
                  <span className="text-light">XP</span>
                </div>

                <div className="col-4">
                  <h3 className="text-white mb-0">
                    Lv. {perfil?.nivel ?? 1}
                  </h3>
                  <span className="text-light">Nível</span>
                </div>

                <div className="col-4">
                  <h3 className="text-white mb-0 text-capitalize">
                    {perfil?.role ?? "-"}
                  </h3>
                  <span className="text-light">Papel</span>
                </div>
              </div>

              <form onSubmit={salvar}>
                <div className="mb-3">
                  <label className="form-label">Nome</label>

                  <input
                    className="form-control"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">E-mail</label>

                  <input
                    className="form-control"
                    value={perfil?.email ?? ""}
                    disabled
                  />
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: "#7C3AED",
                    color: "#fff",
                    border: "none",
                  }}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerfilPage;
