"use client";
import { useEffect, useRef, useState } from "react";
import Architecture from '@/components/architecture'

const TERMINAL_LINES = [
  { delay: 0, text: "$ celery -A backend worker --loglevel=info --pool=solo", type: "cmd" },
  { delay: 800, text: "[2026-06-03 13:42:01] INFO  celery@illuminate ready.", type: "info" },
  { delay: 1400, text: "$ python manage.py runserver 0.0.0.0:8000", type: "cmd" },
  { delay: 2000, text: "[Django] Starting development server at http://0.0.0.0:8000/", type: "info" },
  { delay: 2600, text: "$ uvicorn backend.main:app --host 0.0.0.0 --port 7860", type: "cmd" },
  { delay: 3200, text: "[FastAPI] Application startup complete.", type: "info" },
  { delay: 3800, text: "$ ansible-playbook deploy.yml", type: "cmd" },
  { delay: 4400, text: "PLAY [Deploy ImageOrchestrator Backend] ********", type: "warn" },
  { delay: 4900, text: "TASK [Run Django collectstatic] ... ok", type: "success" },
  { delay: 5300, text: "TASK [Enable and start caddy] ........... ok", type: "success" },
  { delay: 5700, text: "TASK [Enable and start celery worker] ... ok", type: "success" },
  { delay: 6100, text: "PLAY RECAP : localhost : ok=11 changed=3 failed=0", type: "success" },
  { delay: 6600, text: "▌ Illuminate is live at illuminate-backend.duckdns.org", type: "highlight" },
];

const PHASH_STEPS = [
  { label: "Resize to 8x8", detail: "Reduce image to 64 pixels, discard high-frequency details", color: "#22d3ee" },
  { label: "Grayscale", detail: "Convert to luminance values", color: "#a78bfa" },
  { label: "DCT (cosine transform)", detail: "Compute 2D Discrete Cosine Transform across pixel grid", color: "#f59e0b" },
  { label: "Extract top-left 8x8", detail: "Capture low-frequency components", color: "#34d399" },
  { label: "Compute mean", detail: "Average of 64 DCT values (exclude first value)", color: "#f472b6" },
  { label: "Generate 64-bit hash", detail: "Each bit = pixel value > mean ? 1 : 0", color: "#60a5fa" },
  { label: "Hamming distance", detail: "Compare two hashes: count differing bits (< 10 = duplicate)", color: "#22d3ee" },
];

const STACK = [
  { label: "Next.js 16", sub: "App Router · Frontend", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" },
  { label: "Caddy", sub: "Reverse Proxy · HTTPS", logoSvg: "https://caddyserver.com/resources/images/logo-dark.svg" },
  { label: "Django DRF", sub: "REST API · Backend", logoSvg: "https://www.svgrepo.com/show/373554/django.svg" },
  { label: "FastAPI", sub: "ML Microservice · Python", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" },
  { label: "SigLIP", sub: "google/siglip-base-patch16", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
  { label: "Redis", sub: "Queue · Task Broker", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" },
  { label: "Celery", sub: "Async Workers · Tasks", logoSvg: "https://thesvg.org/icons/celery/default.svg" },
  { label: "MinIO", sub: "Object Storage · S3", logoSvg: "https://cdn.prod.website-files.com/681c8426519d8db8f867c1e8/688213291c6ae0daccdbc8b4_MINIO_wordmark_white.svg" },
  { label: "PostgreSQL", sub: "NeonDB · Metadata", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" },
  { label: "Azure VM", sub: "Korea · Cloud Host", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" },
  { label: "Ansible", sub: "IaC · Deploy automation", logoSvg: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ansible/ansible-original.svg" },
  { label: "OpenVINO", sub: "Intel · Inference engine", logoSvg: "https://huggingface.co/datasets/huggingface/brand-assets/resolve/main/hf-logo.svg" },
];


const SEARCH_RESULTS = [
  { query: "sunset over mountains", imgs: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=160&q=80", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&q=80", "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=160&q=80"] },
  { query: "red sports car on road", imgs: ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=160&q=80", "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=160&q=80", "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=160&q=80"] },
  { query: "minimalist architecture", imgs: ["https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=160&q=80", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=160&q=80", "https://images.unsplash.com/photo-1493397212122-2b85dda8106b?w=160&q=80"] },
];

function SearchBoard() {
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setTyped("");
    setShowResults(false);
    const query = SEARCH_RESULTS[qi].query;
    let i = 0;
    const t = setInterval(() => {
      if (i < query.length) {
        setTyped(query.slice(0, i + 1));
        i++;
      } else {
        clearInterval(t);
        setTimeout(() => {
          setShowResults(true);
          let s = 0;
          const st = setInterval(() => {
            if (s >= 94) {
              clearInterval(st);
              return;
            }
            s += 3;
            setScore(s);
          }, 28);
        }, 400);
        setTimeout(() => setQi((q) => (q + 1) % SEARCH_RESULTS.length), 4600);
      }
    }, 55);
    return () => clearInterval(t);
  }, [qi]);

  const current = SEARCH_RESULTS[qi];

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-sm shadow-indigo-500/20" />
          <span className="text-sm font-medium tracking-tight text-slate-200">illuminate search</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-slate-500">semantic retrieval</span>
      </div>

      {/* Search Bar Container */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3.5 py-2.5 shadow-inner">
          {/* Minimalist SVG Search Icon */}
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <span className="flex-1 font-mono text-sm tracking-wide text-slate-200">
            {typed}
            <span className="ml-0.5 inline-block h-3.5 w-0.5 align-middle bg-indigo-400 animate-[blink_0.9s_step-end_infinite]" />
          </span>

          {showResults && (
            <span className="rounded border border-indigo-500/20 bg-indigo-700/50 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-400">
              SigLIP · {score}%
            </span>
          )}
        </div>
      </div>

      {/* Results / Encoding State Grid */}
      <div className="px-4 pb-4">
        <div className="relative flex min-h-[100px] items-center justify-center rounded-lg border border-slate-900 bg-slate-900/20 p-2">
          {showResults ? (
            <div className="grid w-full grid-cols-3 gap-2 animate-[fadeUp_0.4s_ease-out_both]">
              {current.imgs.map((src, i) => (
                <div
                  key={src + i}
                  className="group relative aspect-video overflow-hidden rounded-md border border-slate-800 bg-slate-900"
                >
                  <img
                    src={src}
                    alt="Semantic result"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              encoding query with SigLIP...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TerminalBoard() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [looping, setLooping] = useState(false);
  const started = useRef(false);

  const runAnimation = () => {
    setVisibleLines([]);
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines((prev) => [...prev, i]), line.delay);
    });
    setTimeout(() => setLooping((l) => !l), TERMINAL_LINES[TERMINAL_LINES.length - 1].delay + 3000);
  };

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      runAnimation();
    }
  }, []);

  useEffect(() => {
    if (started.current) runAnimation();
  }, [looping]);

  const color = (type: string) => {
    if (type === "cmd") return "#22d3ee";
    if (type === "info") return "#94a3b8";
    if (type === "warn") return "#f59e0b";
    if (type === "success") return "#34d399";
    if (type === "highlight") return "#a78bfa";
    return "#e2e8f0";
  };

  return (
    <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/90 font-mono text-[12.5px] leading-[1.7] shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-5 py-3">
        <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
        <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
        <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-[11px] font-medium text-white/30">illuminate — deploy</span>
      </div>
      <div className="min-h-[280px] px-6 py-5">
        {TERMINAL_LINES.map((line, i) =>
          visibleLines.includes(i) ? (
            <div key={i} className="mb-0.5 whitespace-pre font-mono" style={{ color: color(line.type) }}>
              {line.text}
              {i === visibleLines[visibleLines.length - 1] && (
                <span
                  className="ml-1 inline-block h-[13px] w-2 align-middle animate-[blink_1s_step-end_infinite]"
                  style={{ background: color(line.type) }}
                />
              )}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function PHashBoard() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setStep((s) => (s + 1) % PHASH_STEPS.length), 2000);
    return () => clearInterval(t);
  }, [auto]);

  const current = PHASH_STEPS[step];
  const grid = Array.from({ length: 64 }, (_, i) => {
    const v = Math.sin(i * 0.7) * 0.5 + Math.cos(i * 0.3) * 0.5;
    return (v + 1) / 2;
  });

  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md">
      <div className="flex flex-wrap items-start gap-8">
        <div>
          <div className="mb-3 font-mono text-[11px] tracking-[1px] text-white/40">8x8 DCT MATRIX</div>
          <div className="grid grid-cols-8 gap-[3px]">
            {grid.map((v, i) => {
              const bit = v > 0.5 ? 1 : 0;
              const isActive = step >= 5;
              return (
                <div
                  key={i}
                  className="flex h-6 w-6 items-center justify-center rounded-[6px] font-mono font-bold text-[#0a0c12] transition-all duration-300"
                  style={{
                    fontSize: isActive ? 10 : 0,
                    background: isActive
                      ? bit === 1
                        ? current.color
                        : "rgba(255,255,255,0.05)"
                      : `rgba(${Math.round(v * 180)}, ${Math.round(v * 120)}, ${Math.round(v * 240)}, ${0.2 + v * 0.5})`,
                  }}
                >
                  {isActive ? bit : ""}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-5 flex flex-wrap gap-2">
            {PHASH_STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setStep(i);
                  setAuto(false);
                }}
                className="rounded-full border px-3.5 py-1.5 font-mono text-[11px] transition-all duration-200"
                style={{
                  background: step === i ? `${current.color}20` : "transparent",
                  borderColor: step === i ? current.color : "rgba(255,255,255,0.1)",
                  color: step === i ? current.color : "rgba(255,255,255,0.4)",
                }}
              >
                {s.label.split(" ")[0]}
              </button>
            ))}
          </div>
          <div className="mb-2.5 font-mono text-xl font-semibold" style={{ color: current.color }}>
            {current.label}
          </div>
          <div className="text-sm leading-6 text-white/60">{current.detail}</div>
          {step === 6 && (
            <div className="mt-5 rounded-xl bg-black/30 p-3 font-mono text-xs">
              <div className="mb-2 text-white/40">Hamming distance (hash_a XOR hash_b)</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 32 }, (_, i) => {
                  const diff = i % 7 === 0 || i % 13 === 0;
                  return (
                    <span key={i} className="text-[13px] font-normal" style={{ color: diff ? "#f87171" : "#34d399", fontWeight: diff ? 600 : 400 }}>
                      {diff ? "1" : "0"}
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-emerald-400">→ Distance: 4 (near-duplicate detected)</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RedisBrokerBoard() {
  const [tasks, setTasks] = useState([
    { id: "t1", label: "embed:img_4821", status: "processing", q: "embedding" },
    { id: "t2", label: "hash:img_4822", status: "queued", q: "image_processing" },
    { id: "t3", label: "embed:img_4819", status: "done", q: "embedding" },
    { id: "t4", label: "hash:img_4820", status: "done", q: "image_processing" },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setTasks((prev) => {
        const next = [...prev];
        const processing = next.findIndex((t) => t.status === "processing");
        if (processing !== -1) next[processing].status = "done";
        const queued = next.findIndex((t) => t.status === "queued");
        if (queued !== -1) next[queued].status = "processing";
        const id = "t" + (Date.now() % 9999);
        const isEmbed = Math.random() > 0.5;
        next.push({
          id,
          label: `${isEmbed ? "embed" : "hash"}:img_${4820 + next.length}`,
          status: "queued",
          q: isEmbed ? "embedding" : "image_processing",
        });
        return next.slice(-8);
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const statusColor = (s: string) => (s === "done" ? "#34d399" : s === "processing" ? "#f59e0b" : "rgba(255,255,255,0.3)");
  const statusLabel = (s: string) => (s === "done" ? "✓ done" : s === "processing" ? "⟳ run" : "· queued");

  return (
    <div className="rounded-[20px] border border-red-400/25 bg-slate-950/90 p-6 backdrop-blur-md">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_10px_#f87171]" />
        <span className="font-mono text-sm font-semibold text-red-400">Redis · Task Queue</span>
        <span className="ml-auto font-mono text-[11px] text-white/25">port 6379</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2.5 font-mono text-[11px] text-white/40">queue: image_processing</div>
          {tasks.filter((t) => t.q === "image_processing").map((task) => (
            <div key={task.id} className="mb-1.5 flex items-center justify-between rounded-[10px] border border-white/5 bg-white/5 px-3 py-2">
              <span className="font-mono text-xs text-white/70">{task.label}</span>
              <span className="font-mono text-[11px]" style={{ color: statusColor(task.status) }}>{statusLabel(task.status)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="mb-2.5 font-mono text-[11px] text-white/40">queue: embedding</div>
          {tasks.filter((t) => t.q === "embedding").map((task) => (
            <div key={task.id} className="mb-1.5 flex items-center justify-between rounded-[10px] border border-white/5 bg-white/5 px-3 py-2">
              <span className="font-mono text-xs text-white/70">{task.label}</span>
              <span className="font-mono text-[11px]" style={{ color: statusColor(task.status) }}>{statusLabel(task.status)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/10 px-3.5 py-2.5">
        <span className="font-mono text-[11px] text-white/50">⚙️ Workers: image_processing (concurrency=2)  |  embedding (concurrency=1)</span>
      </div>
    </div>
  );
}

export default function IlluminatePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) {
      // 1.0 is normal speed. 0.5 is half speed.
      videoRef.current.playbackRate = 0.3;
    }
  }, []);
  return (

    <div className="min-h-screen overflow-x-hidden bg-[#0a0c12] font-sans text-slate-200">

      {/* 1. Landing Page -  Search Demo */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <video ref={videoRef} autoPlay loop muted playsInline className="absolute left-0 top-0 z-0 h-full w-full object-cover">
          <source src="/intro.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(0,0,0,0.75),#0a0c12_90%)]" />
        <div className="relative z-10 mx-auto w-full max-w-300 px-10">
          <nav className="mb-14 flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-400" />
              <span className="font-mono text-lg font-semibold tracking-[2px] text-white">ILLUMINATE</span>
            </div>
            <div className="flex gap-3">
              <a href="https://github.com/Sri-Ram-A/ImageOrchestrator" className="rounded border border-white/20 px-5 py-2 text-[13px] font-medium text-white/70 no-underline">
                GitHub
              </a>
              <a href="/register" className="rounded bg-blue-700 px-6 py-2 text-[13px] font-semibold text-white no-underline">
                Try Demo
              </a>
            </div>
          </nav>

          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div className="section-fade">
              <div className="mb-8 inline-flex items-center gap-2.5 rounded border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5">
                <span className="h-2 w-2 rounded bg-blue-700 [animation:slowPulse_2s_infinite]" />
                <span className="font-mono text-[12px] text-cyan-300">DEPLOYED · AZURE VM · KOREA</span>
              </div>
              <h1 className="mb-6 text-5xl font-semibold leading-[1.1] tracking-[-2px] text-transparent md:text-[64px]" style={{ background: "linear-gradient(135deg, #ffffff, #94a3b8)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                Image search, <br />semantically <span className="text-cyan-700">understood</span>.
              </h1>

              <div className="flex gap-4">
                <a href="#architecture" className="rounded bg-blue-700 px-7 py-3 text-sm font-semibold text-white no-underline">
                  Explore Architecture
                </a>
                <a href="/register" className="rounded border border-white/20 px-7 py-3 text-sm text-white/80 no-underline">
                  Register
                </a>
              </div>
              <div className="mt-14 flex gap-10">
                {[
                  { v: "64-bit", label: "PHash fingerprint" },
                  { v: "SigLIP", label: "google/siglip-base" },
                  { v: "OpenVINO", label: "Intel inference" },
                ].map((stat) => (
                  <div key={stat.v}>
                    <div className="text-[22px] font-semibold text-white">{stat.v}</div>
                    <div className="mt-1 text-xs text-white/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="section-fade" style={{ animationDelay: "0.2s" }}>
              <SearchBoard />
            </div>
          </div>
        </div>
      </section>


      {/* 2. Architecture Flow */}
      <section id="architecture" className="mx-auto px-10 py-20">
        <Architecture />
      </section>


      <section id="pipeline" className="mx-auto max-w-400 px-10 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left side - PHASH */}
          <div>
            <div className="mb-3 font-mono text-[12px] text-amber-400">03 / DEDUPLICATION</div>
            <h2 className="mb-4 text-[32px] font-medium">Perceptual hashing</h2>
            <p className="mb-7 text-white/50">pHash catches duplicates even after resize or compression. Hamming distance &lt; 10 → near-duplicate.</p>
            <PHashBoard />
          </div>

          {/* Right side - SIGLIP */}
          <div>
            <div className="mb-3 font-mono text-[12px] text-violet-400">04 / SEMANTIC SEARCH</div>
            <h2 className="mb-4 text-[32px] font-medium">SigLIP embeddings</h2>
            <p className="mb-7 text-white/50">Google's SigLIP aligns images and text in 512-dimensional space. Qdrant for ANN search.</p>
            <div className="rounded-[20px] border border-violet-400/20 bg-slate-950/80 p-6">
              <div className="relative mb-5 h-40">
                {[
                  { x: 30, y: 40, color: "#60a5fa" },
                  { x: 200, y: 30, color: "#34d399" },
                  { x: 120, y: 110, color: "#f59e0b" },
                  { x: 38, y: 55, color: "#a78bfa", isQuery: true },
                ].map((dot, i) => (
                  <div
                    key={i}
                    className="absolute h-3 w-3 rounded-full [animation:slowPulse_3s_infinite]"
                    style={{
                      left: dot.x,
                      top: dot.y,
                      background: dot.color,
                      boxShadow: dot.isQuery ? "0 0 16px #a78bfa" : undefined,
                    }}
                  />
                ))}
                <div className="absolute left-[52px] top-[48px] font-mono text-[11px] text-violet-400">⌕ "sunset over mountains"</div>
              </div>
              <div className="flex justify-between gap-3">
                {["Image (224x224)", "SigLIP", "512-d vector", "Qdrant"].map((s) => (
                  <div key={s} className="rounded-full bg-violet-400/10 px-3 py-1.5 text-[11px] text-violet-400">{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-400 gap-12 px-10 py-10 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-3 font-mono text-[12px] text-red-400">05 / ASYNC WORKERS</div>
          <h2 className="mb-4 text-[32px] font-medium">Redis + Celery</h2>
          <p className="mb-6 text-white/50">Decoupled image processing and embedding generation. Django enqueues → Celery workers consume.</p>
          <div className="flex flex-col gap-3">
            {[
              { q: "image_processing", tasks: "pHash, thumbnails, MinIO upload", color: "#fb923c" },
              { q: "embedding", tasks: "SigLIP encode, Qdrant upsert", color: "#f59e0b" },
            ].map((w) => (
              <div key={w.q} className="rounded-2xl border p-4" style={{ background: "rgba(255,255,255,0.03)", borderColor: `${w.color}30` }}>
                <div className="font-mono" style={{ color: w.color }}>{w.q}</div>
                <div className="text-xs text-white/50">{w.tasks}</div>
              </div>
            ))}
          </div>
        </div>
        <RedisBrokerBoard />
      </section>

      <section id="deploy" className="mx-auto grid max-w-400 gap-12 px-10 py-10 lg:grid-cols-2 lg:py-20">
        <div>
          <div className="mb-3 font-mono text-[12px] text-emerald-400">06 / DEVOPS</div>
          <h2 className="mb-4 text-[32px] font-medium">Ansible-driven deploy</h2>
          <p className="mb-6 text-white/50">Single playbook provisions 11 tasks: virtualenv, systemd services, Caddy, and HTTPS.</p>
          <div className="flex flex-col gap-2">
            {["Python deps + venv", "collectstatic", "Gunicorn service", "FastAPI service", "Caddy + DuckDNS TLS", "Celery worker"].map((item, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-dashed border-white/5 pb-1.5">
                <span className="font-mono text-xs text-emerald-400">0{i + 1}</span>
                <span className="text-[13px] text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <TerminalBoard />
      </section>

      <section id="stack" className="mx-auto max-w-400 px-10 py-10 pb-20">
        <div className="mb-3 font-mono text-[12px] tracking-[2px] text-blue-400">07 / STACK</div>
        <h2 className="mb-12 text-[42px] font-medium">Technology</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STACK.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4">
              <img src={item.logoSvg} alt={item.label} className="h-7 w-7" />
              <div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-[11px] text-white/40">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 px-10 py-8 text-center text-[13px] text-white/30">
        illuminate · image orchestration platform · illuminate-backend.duckdns.org
      </footer>
    </div>
  );
}
