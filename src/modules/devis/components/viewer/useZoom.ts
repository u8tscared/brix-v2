// Zoom du visionneur : ajusté à la largeur par défaut, +/-, molette avec Ctrl, pincement à deux doigts.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { PAGE_W } from '../doc/PagedDoc';

const STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];
const clamp = (v: number) => Math.max(0.35, Math.min(3, v));

export function useZoom(canvas: RefObject<HTMLDivElement>, pad: number, maxFit = 1.15) {
  const [zoom, setZoomRaw] = useState<number | null>(null); // null = ajusté à la largeur
  const [width, setWidth] = useState(900);
  const [live, setLive] = useState(1); // facteur temporaire pendant un pincement
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [canvas]);
  const fit = Math.min(maxFit, Math.max(0.3, (width - pad * 2) / PAGE_W));
  const scale = zoom ?? fit;

  // Garder le même endroit du document à l'écran quand l'échelle change.
  const anchor = useRef<number | null>(null);
  const setZoom = useCallback(
    (z: number | null) => {
      const el = canvas.current;
      if (el) anchor.current = (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight);
      setZoomRaw(z === null ? null : clamp(z));
    },
    [canvas],
  );
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || anchor.current === null) return;
    el.scrollTop = anchor.current * el.scrollHeight - el.clientHeight / 2;
    anchor.current = null;
  }, [scale, canvas]);

  const step = (dir: 1 | -1) => {
    const cur = scale;
    const next = dir > 0 ? STEPS.find((s) => s > cur + 0.01) ?? 3 : [...STEPS].reverse().find((s) => s < cur - 0.01) ?? 0.35;
    setZoom(next);
  };

  // Ctrl + molette (et pincement du pavé tactile, qui arrive comme Ctrl + molette).
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((zoomRef.current ?? fitRef.current) * Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canvas, setZoom]);

  // Pincement à deux doigts (téléphone, tablette) : échelle visuelle en direct, validée au relâchement.
  const zoomRef = useRef(zoom);
  const fitRef = useRef(fit);
  zoomRef.current = zoom;
  fitRef.current = fit;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let d0 = 0;
    let f = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        d0 = dist(e.touches);
        f = 1;
      }
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !d0) return;
      e.preventDefault();
      f = dist(e.touches) / d0;
      setLive(f);
    };
    const end = () => {
      if (!d0) return;
      d0 = 0;
      setLive(1);
      if (Math.abs(f - 1) > 0.02) setZoom((zoomRef.current ?? fitRef.current) * f);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [canvas, setZoom]);

  return { scale, fit, isFit: zoom === null, live, setZoom, step };
}
