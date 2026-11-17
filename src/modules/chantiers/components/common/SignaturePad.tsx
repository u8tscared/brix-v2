import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { cn } from '@/components/ui';

/** Zone de signature tactile (doigt, stylet ou souris). Renvoie une image PNG (data URL). */
export function SignaturePad({ label, value, onChange, className }: { label: string; value?: string; onChange: (dataUrl?: string) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);
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
    ctx.strokeStyle = '#17171f';
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
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineWidth = e.pressure && e.pointerType === 'pen' ? 1 + e.pressure * 2.5 : 2.2;
    ctx.beginPath();
    ctx.moveTo(...last.current);
    ctx.lineTo(...p);
    ctx.stroke();
    last.current = p;
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
    <div className={cn('rounded-[14px] border border-line bg-white', className)}>
      <div className="flex h-10 items-center justify-between border-b border-line px-3">
        <span className="text-[13px] font-medium">{label}</span>
        <button onClick={clear} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-ink-2 hover:bg-sub" type="button">
          <Eraser className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>
      <div className="relative">
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="block h-[150px] w-full touch-none cursor-crosshair" aria-label={label} />
        {empty && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-ink-3">Signez ici avec le doigt</span>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-line2" />
      </div>
    </div>
  );
}
