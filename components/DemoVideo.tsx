"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export default function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);  // true = usuario dio play con sonido
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  // Resetea al estado inicial (autoplay muted silencioso)
  const reset = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.currentTime = 0;
    v.play().catch(() => {});
    setStarted(false);
    setPaused(false);
    setMuted(true);
  }, []);

  // IntersectionObserver — pausa y resetea cuando sale de la pantalla
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          reset();
        }
      },
      { threshold: 0.25 },
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [reset]);

  // Click en play → reinicia desde 0 con sonido
  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setStarted(true);
    setPaused(false);
    setMuted(false);
  };

  // Pausa / reanuda
  const togglePause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  // Mute / unmute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto mt-12 overflow-hidden rounded-3xl border border-border shadow-[0_40px_80px_-40px_rgba(15,110,110,0.35)] bg-[#FAF7F2]"
    >
      {/* Video — autoplay muted por default */}
      <video
        ref={videoRef}
        src="/demo.mp4"
        poster="/demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        className="w-full block"
        onPlay={() => { if (!started) setMuted(true); }}
      />

      {/* ── Overlay antes de que el usuario dé play con sonido ── */}
      {!started && (
        <button
          onClick={handlePlay}
          aria-label="Reproducir demo con sonido"
          className="absolute inset-0 flex items-center justify-center group"
        >
          {/* Fondo oscuro sutil al hover */}
          <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 rounded-3xl" />

          {/* Botón play */}
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur-sm transition-transform group-hover:scale-110">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5 text-primary">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>

          {/* Label abajo izquierda */}
          <span className="absolute bottom-4 left-4 rounded-full bg-fg/75 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm select-none">
            Click para ver con sonido · 1 min
          </span>
        </button>
      )}

      {/* ── Controles post-play ── */}
      {started && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {/* Pausa / play */}
          <button
            onClick={togglePause}
            aria-label={paused ? "Continuar" : "Pausar"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg/80 backdrop-blur-sm border border-border shadow-sm transition-colors hover:bg-bg-elevated"
          >
            {paused ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="translate-x-px text-primary">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-fg-muted">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            )}
          </button>

          {/* Mute / unmute */}
          <button
            onClick={toggleMute}
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg/80 backdrop-blur-sm border border-border shadow-sm transition-colors hover:bg-bg-elevated"
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
