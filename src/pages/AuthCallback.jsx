import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function finalizarLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/");
        return;
      }

      const user = session.user;

      // Aqui futuramente você poderá criar o perfil do usuário
      // caso ainda não exista.

      navigate("/dashboard");
    }

    finalizarLogin();
  }, [navigate]);

  return (
    <div className="vh-100 d-flex justify-content-center align-items-center">
      <h3>Entrando...</h3>
    </div>
  );
}

export default AuthCallback;