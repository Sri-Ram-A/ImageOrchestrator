"use client";

import React, { useMemo, useState } from "react";

type Id =
  | "nextjs"
  | "caddy"
  | "django"
  | "minio"
  | "postgres"
  | "redis"
  | "celery"
  | "fastapi"
  | "siglip"
  | "qdrant";

type Node = {
  id: Id;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
  icon: React.ReactNode;
};

type Edge = {
  from: Id;
  to: Id;
  label: string;
};

const Logos = {
  nextjs: () => (
    <svg className="h-5 w-5 fill-white" viewBox="0 0 180 180" aria-hidden="true">
      <path d="M116.5 102c0-7.8-4.4-14-11-14-6.7 0-11 6.2-11 14s4.3 14 11 14c6.6 0 11-6.2 11-14zm-37.4 0c0-7.8-4.3-14-11-14-6.6 0-11 6.2-11 14s4.4 14 11 14c6.7 0 11-6.2 11-14zM180 90c0 49.7-40.3 90-90 90S0 139.7 0 90 40.3 0 90 0s90 40.3 90 90zm-45.3 35.4c0-18.4-12.7-31.5-31-31.5-12.4 0-21.7 6-26.6 15V61.2h-17v64.2h17v-21.4c0-10.7 6.2-15.8 13.5-15.8 7.6 0 11.4 5.2 11.4 14.5v22.7h17.1v-23.3c0-10.7 6.2-15.8 13.5-15.8 7.6 0 11.3 5.2 11.3 14.5v24.6h17.1v-26.2z" />
    </svg>
  ),
  caddy: () => (
    <svg className="h-4.5 w-4.5 stroke-cyan-300 fill-none" viewBox="0 0 24 24" strokeWidth="2.4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  django: () => (
    <svg className="h-5 w-5 fill-emerald-500" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.7 1h3.6v19.4c0 1.6-.4 2.6-1.3 3.1-.8.5-2.2.5-4 .5H8.5v-3.2h1.4c1.2 0 1.7-.4 1.7-1.3V1.1zm6 .6h3.6v15h-3.6V1.6zM2.7 5.2h3.6v7.8H2.7V5.2z" />
    </svg>
  ),
  minio: () => (
    <svg className="h-5 w-5 fill-rose-500" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  postgres: () => (
    <svg className="h-5 w-5 fill-sky-400" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  ),
  redis: () => (
    <svg className="h-5 w-5 fill-red-500" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-6h2v2h-2v-2zm0-8h2v6h-2V8z" />
    </svg>
  ),
  celery: () => (
    <svg className="h-5 w-5 fill-emerald-400" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.32 19.44c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  ),
  fastapi: () => (
    <svg className="h-5 w-5 fill-teal-400" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z" />
    </svg>
  ),
  siglip: () => (
    <svg className="h-5 w-5 fill-violet-400" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  qdrant: () => (
    <svg className="h-5 w-5 fill-pink-400" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L2 22h20L12 2zm0 5l5.5 11h-11L12 7z" />
    </svg>
  ),
};

const W = 1500;
const H = 400;
const NODE_W = 192;
const NODE_H = 76;

const NODES: Node[] = [
  { id: "nextjs", title: "Next.js UI", subtitle: "Web App Frontend", x: 24, y: 162, color: "#ffffff", icon: <Logos.nextjs /> },
  { id: "caddy", title: "Caddy Proxy", subtitle: "Edge Ingress Gateway", x: 244, y: 162, color: "#22d3ee", icon: <Logos.caddy /> },
  { id: "django", title: "Django REST", subtitle: "Application Core", x: 464, y: 162, color: "#10b981", icon: <Logos.django /> },
  { id: "minio", title: "MinIO Storage", subtitle: "S3 Object Store", x: 684, y: 36, color: "#fb7185", icon: <Logos.minio /> },
  { id: "redis", title: "Redis Broker", subtitle: "In-Memory Queue", x: 684, y: 162, color: "#ef4444", icon: <Logos.redis /> },
  { id: "postgres", title: "PostgreSQL", subtitle: "Metadata Store", x: 684, y: 288, color: "#38bdf8", icon: <Logos.postgres /> },
  { id: "celery", title: "Celery Cluster", subtitle: "Async Task Worker", x: 904, y: 162, color: "#4ade80", icon: <Logos.celery /> },
  { id: "fastapi", title: "FastAPI", subtitle: "Inference Server", x: 1124, y: 162, color: "#2dd4bf", icon: <Logos.fastapi /> },
  { id: "siglip", title: "Google SigLIP", subtitle: "Embedding Encoder", x: 1344, y: 36, color: "#a78bfa", icon: <Logos.siglip /> },
  { id: "qdrant", title: "Qdrant DB", subtitle: "Vector Store", x: 1344, y: 288, color: "#f472b6", icon: <Logos.qdrant /> },
];

const EDGES: Edge[] = [
  { from: "nextjs", to: "caddy", label: "TLS Request" },
  { from: "caddy", to: "django", label: "Proxy Pass" },
  { from: "django", to: "minio", label: "Imagesss" },
  { from: "django", to: "redis", label: "Dispatch Task" },
  { from: "django", to: "postgres", label: "" },
  { from: "redis", to: "celery", label: "Poll Event" },
  { from: "celery", to: "fastapi", label: "Inference Payload" },
  { from: "fastapi", to: "siglip", label: "Tensorrr" },
  { from: "fastapi", to: "qdrant", label: "Ups Vector" },
];

function center(node: Node) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

function getAnchors(from: Node, to: Node) {
  const forward = to.x > from.x;
  return {
    p1: { x: forward ? from.x + NODE_W : from.x, y: from.y + NODE_H / 2 },
    p2: { x: forward ? to.x : to.x + NODE_W, y: to.y + NODE_H / 2 },
  };
}

function computeBezier(from: Node, to: Node) {
  const { p1, p2 } = getAnchors(from, to);
  const dx = Math.max(90, Math.abs(p2.x - p1.x) * 0.44);
  return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
}

export default function PremiumArchitectureFlowchart() {
  const [hovered, setHovered] = useState<Id | null>(null);

  const activeGroup = useMemo(() => {
    if (!hovered) return null;
    const connected = new Set<Id>([hovered]);
    EDGES.forEach((e) => {
      if (e.from === hovered) connected.add(e.to);
      if (e.to === hovered) connected.add(e.from);
    });
    return connected;
  }, [hovered]);

  return (
    <div className="w-full overflow-x-auto rounded border border-slate-900 bg-slate-950 p-7 tracking-tight text-slate-200 shadow-2xl">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono uppercase  text-indigo-400 text-[12px]">02 / Pipeline Topography</div>
          <h2 className="mt-1.5 text-2xl font-semibold text-white tracking-tight">System Data Flow</h2>
          <p className="mt-1 text-sm text-slate-400">The labels are now placed for readability against the black background.</p>
        </div>
      </div>

      <div className="relative select-none" style={{ width: W, height: H }}>
        <svg className="absolute inset-0 z-0 pointer-events-none" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            {EDGES.map((e) => {
              const a = NODES.find((n) => n.id === e.from)!;
              const b = NODES.find((n) => n.id === e.to)!;
              return (
                <linearGradient
                  key={`grad-${e.from}-${e.to}`}
                  id={`grad-${e.from}-${e.to}`}
                  gradientUnits="userSpaceOnUse"
                  x1={center(a).x}
                  y1={center(a).y}
                  x2={center(b).x}
                  y2={center(b).y}
                >
                  <stop offset="0%" stopColor={a.color} />
                  <stop offset="45%" stopColor={a.color} stopOpacity="0.85" />
                  <stop offset="55%" stopColor={b.color} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={b.color} />
                </linearGradient>
              );
            })}
            <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map((e) => {
            const a = NODES.find((n) => n.id === e.from)!;
            const b = NODES.find((n) => n.id === e.to)!;
            const path = computeBezier(a, b);
            const highlighted = !hovered || hovered === e.from || hovered === e.to;
            const { p1, p2 } = getAnchors(a, b);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 50;

            return (
              <g key={`${e.from}-${e.to}`} opacity={highlighted ? 1 : 0.15} style={{ transition: "opacity 0.25s ease" }}>
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#grad-${e.from}-${e.to})`}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeOpacity={0.1}
                  filter="url(#neonGlow)"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#grad-${e.from}-${e.to})`}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeOpacity={highlighted ? 1 : 0.45}
                  filter="url(#neonGlow)"
                />
                {highlighted && (
                  <circle r="3" fill="white" filter="url(#neonGlow)">
                    <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
                  </circle>
                )}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect x="-48" y="-9" width="96" height="18" rx="9" fill="rgba(2,6,23,0.9)" stroke="rgba(148,163,184,0.2)" />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="9"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    letterSpacing="0.14em"
                  >
                    {e.label.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 z-10 pointer-events-none">
          {NODES.map((n) => {
            const isSelf = hovered === n.id;
            const isLinked = activeGroup?.has(n.id);
            const isDimmable = activeGroup && !isSelf && !isLinked;

            return (
              <div
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
                className={`pointer-events-auto absolute flex items-center gap-3 rounded border bg-slate-950/92 px-4 py-3 transition-all duration-300 cursor-crosshair backdrop-blur-md ${isSelf
                    ? "border-slate-300 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.55)] scale-[1.02]"
                    : isLinked
                      ? "border-slate-700 shadow-md"
                      : "border-slate-900"
                  } ${isDimmable ? "opacity-30" : "opacity-100"}`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-slate-900/70"
                  style={{ borderColor: isSelf ? `${n.color}35` : "rgba(148,163,184,0.08)" }}
                >
                  {n.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[13px] font-semibold tracking-tight text-slate-50"
                    style={{ textShadow: "0 1px 1px rgba(0,0,0,0.55)" }}
                  >
                    {n.title}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] leading-4 text-slate-400">
                    {n.subtitle}
                  </div>
                </div>

                <span
                  className="h-2 w-2 shrink-0 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: n.color,
                    boxShadow: isSelf || isLinked ? `0 0 12px 2px ${n.color}` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
