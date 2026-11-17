import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';

/** Zone de signature tactile (doigt, stylet ou souris). Renvoie une image PNG (data URL). */
export function SignaturePad({ label, value, onChange, className }: { label: string; value?: string; onChange: (dataUrl?: string) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);
  const mid = useRef<[number, number] | null>(null);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15122a';
    ctx.lineWidth = 2.2;
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    mid.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineWidth = e.pressure && e.pointerType === 'pen' ? 1 + e.pressure * 2.5 : 2.4;
    // Courbe lissée entre les milieux des segments : trait propre, sans angles.
    const m: [number, number] = [(last.current[0] + p[0]) / 2, (last.current[1] + p[1]) / 2];
    ctx.beginPath();
    ctx.moveTo(...(mid.current ?? last.current));
    ctx.quadraticCurveTo(last.current[0], last.current[1], m[0], m[1]);
    ctx.stroke();
    last.current = p;
    mid.current = m;
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(ref.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(undefined);
  };

  return (
    <div className={cn('overflow-hidden rounded-[16px] bg-white shadow-card transition-shadow duration-300', !empty && 'shadow-[0_0_0_1.5px_#86d9a6,0_8px_20px_-12px_rgba(21,128,61,.35)]', className)}>
      <div className="flex h-11 items-center justify-between gap-2 border-b border-line pl-3.5 pr-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
          {!empty ? <SuccessDot size={18} /> : <span className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-dashed border-line2" />}
          <span className="truncate">{label}</span>
        </span>
        <button onClick={clear} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-ink-2 hover:bg-sub" type="button">
          <Eraser className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>
      <div className="relative">
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="block h-[170px] w-full cursor-crosshair touch-none bg-[radial-gradient(#efedf5_1px,transparent_1px)] [background-size:14px_14px]" aria-label={label} />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-ink-3">Signez ici avec le doigt</span>}
        <span className="pointer-events-none absolute bottom-6 left-6 text-[18px] leading-none text-ink-3/60">×</span>
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-line2" />
      </div>
    </div>
  );
}
