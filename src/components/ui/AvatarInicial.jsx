// src/components/ui/AvatarInicial.jsx
//
// Circulo com as iniciais do jogador. A cor sai do proprio nome, entao a
// mesma pessoa aparece sempre com a mesma cor em qualquer lista.

const PALETA = ["#7C3AED", "#2563EB", "#EC4899", "#10B981", "#F59E0B", "#06B6D4"];

function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function corDoNome(nome = "") {
  let soma = 0;

  for (let i = 0; i < nome.length; i += 1) soma += nome.charCodeAt(i);

  return PALETA[soma % PALETA.length];
}

function AvatarInicial({ nome = "", tamanho = 40, borda }) {
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
      aria-hidden="true"
      style={{
        width: `${tamanho}px`,
        height: `${tamanho}px`,
        borderRadius: "50%",
        background: corDoNome(nome),
        color: "#fff",
        fontSize: `${Math.max(11, tamanho * 0.36)}px`,
        border: borda ? `2px solid ${borda}` : "none",
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

export default AvatarInicial;
