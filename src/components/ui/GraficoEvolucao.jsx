// src/components/ui/GraficoEvolucao.jsx
//
// Linha de evolucao em SVG puro (sem dependencia nova). O viewBox fixo com
// width 100% faz o grafico acompanhar a largura da tela sem calculo de
// layout no JS.

import { useId } from "react";
import { CORES } from "./formato";

const LARGURA = 600;
const ALTURA = 180;
const MARGEM = { topo: 16, direita: 12, baixo: 26, esquerda: 34 };

function GraficoEvolucao({
  pontos = [],
  cor = CORES.lilas,
  sufixo = "%",
  maximo,
  titulo = "Evolução",
}) {
  // Id proprio do gradiente: dois graficos na mesma pagina nao podem
  // disputar o mesmo <defs>.
  // Os ":" que o useId gera atrapalham dentro de url(#...): saem fora.
  const gradiente = `gradiente-evolucao-${useId().replace(/:/g, "")}`;

  if (pontos.length === 0) return null;

  const valores = pontos.map((ponto) => Number(ponto.valor) || 0);
  const teto = Math.max(maximo ?? 100, ...valores) || 100;

  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.baixo;

  // Um ponto so nao tem linha: centraliza para nao dividir por zero.
  const x = (indice) =>
    pontos.length === 1
      ? MARGEM.esquerda + largura / 2
      : MARGEM.esquerda + (indice / (pontos.length - 1)) * largura;

  const y = (valor) => MARGEM.topo + altura - (valor / teto) * altura;

  const linha = valores.map((valor, i) => `${x(i)},${y(valor)}`).join(" ");

  const area = `${MARGEM.esquerda},${MARGEM.topo + altura} ${linha} ${
    x(pontos.length - 1)
  },${MARGEM.topo + altura}`;

  const guias = [0, teto / 2, teto];

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={`${titulo}: ${valores.join(", ")}`}
      // Sem atributo height: com viewBox + width 100% o SVG mantem a
      // proporcao sozinho e acompanha a largura da tela.
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {guias.map((guia) => (
        <g key={guia}>
          <line
            x1={MARGEM.esquerda}
            y1={y(guia)}
            x2={LARGURA - MARGEM.direita}
            y2={y(guia)}
            stroke="rgba(255,255,255,.08)"
            strokeWidth="1"
          />

          <text
            x={MARGEM.esquerda - 6}
            y={y(guia) + 4}
            textAnchor="end"
            fill="rgba(255,255,255,.4)"
            fontSize="11"
          >
            {Math.round(guia)}
          </text>
        </g>
      ))}

      <polygon points={area} fill={`url(#${gradiente})`} />

      <polyline
        points={linha}
        fill="none"
        stroke={cor}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {pontos.map((ponto, i) => (
        <g key={`${ponto.rotulo}-${i}`}>
          <circle cx={x(i)} cy={y(valores[i])} r="4" fill={cor}>
            <title>
              {ponto.rotulo}: {valores[i]}
              {sufixo}
            </title>
          </circle>

          {/* Rotulo so nas pontas e no meio: mais que isso vira sopa de texto */}
          {(i === 0 || i === pontos.length - 1) && (
            <text
              x={x(i)}
              y={ALTURA - 8}
              textAnchor={i === 0 ? "start" : "end"}
              fill="rgba(255,255,255,.4)"
              fontSize="11"
            >
              {ponto.rotulo}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default GraficoEvolucao;
