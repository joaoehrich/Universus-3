// src/hooks/usePerfil.js

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const CAMPOS = "id, name, email, role, xp, nivel, avatar_config, created_at";

// Carrega a sessão atual e o perfil correspondente na tabela profiles.
// Usado pelo Layout, Topbar e pelas páginas que mostram dados do usuário.
export function usePerfil() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUsuario(user ?? null);

      if (!user) {
        setPerfil(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(CAMPOS)
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setPerfil(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      carregar();
    });

    return () => listener.subscription.unsubscribe();
  }, [carregar]);

  return { usuario, perfil, carregando, erro, recarregar: carregar, setPerfil };
}
