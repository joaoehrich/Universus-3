// src/hooks/useSala.js
//
// Mantem a sala e a lista de jogadores sincronizadas em tempo real.
// O Realtime do Supabase avisa quando o anfitriao muda o estado da
// partida ou quando alguem entra/pontua; o intervalo de 5s existe so
// como rede de seguranca caso a conexao do canal caia no meio da aula.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { listarJogadores } from "../lib/partida";

const INTERVALO_FALLBACK = 5000;

export function useSala(salaId) {
  const [sala, setSala] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const recarregar = useCallback(async () => {
    if (!salaId) return;

    try {
      const [salaResposta, lista] = await Promise.all([
        supabase
          .from("salas")
          .select("*, quizzes(title, category, difficulty)")
          .eq("id", salaId)
          .maybeSingle(),
        listarJogadores(salaId),
      ]);

      if (salaResposta.error) throw salaResposta.error;

      setSala(salaResposta.data);
      setJogadores(lista);
      setErro("");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [salaId]);

  useEffect(() => {
    // Sem id ainda: a tela continua em "carregando" ate a pagina
    // resolver o codigo da URL (ou cair no erro dela mesma).
    if (!salaId) return;

    let ativo = true;

    async function sincronizar() {
      if (ativo) await recarregar();
    }

    sincronizar();

    const canal = supabase
      .channel(`sala-${salaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "salas",
          filter: `id=eq.${salaId}`,
        },
        sincronizar
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sala_jogadores",
          filter: `sala_id=eq.${salaId}`,
        },
        sincronizar
      )
      .subscribe();

    const relogio = setInterval(sincronizar, INTERVALO_FALLBACK);

    return () => {
      ativo = false;
      clearInterval(relogio);
      supabase.removeChannel(canal);
    };
  }, [salaId, recarregar]);

  return { sala, jogadores, carregando, erro, recarregar };
}
