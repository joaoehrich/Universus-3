// src/components/Layout.jsx

import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { supabase } from "../lib/supabaseClient";
import { usePerfil } from "../hooks/usePerfil";

import "../styles/Layout.css";

function Layout() {
  const navigate = useNavigate();
  const { usuario, perfil, carregando } = usePerfil();

  // Sem sessão não existe dado nenhum para mostrar: volta para o login.
  useEffect(() => {
    if (!carregando && !usuario) {
      navigate("/", { replace: true });
    }
  }, [carregando, usuario, navigate]);

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <div id="wrapper">
        <Sidebar />

        <div id="content-wrapper">
          <Topbar onLogout={handleLogout} perfil={perfil} />

          <main className="page-content">
            {carregando ? (
              <p className="text-light">Carregando...</p>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default Layout;
