import type { ReactNode } from 'react';

/** Cadre de téléphone : contenu conçu pour 390 px, réduit à `width`. */
export function PhoneFrame({ width = 300, height = 600, children }: { width?: number; height?: number; children: ReactNode }) {
  const scale = (width - 20) / 390;
  const inner = height - 20;
  return (
    <div className="relative mx-auto rounded-[46px] bg-[#15122a] p-[10px] shadow-[0_30px_60px_-30px_rgba(19,15,38,.6),inset_0_0_0_1.5px_#3a3456]" style={{ width, height }}>
      <span aria-hidden className="absolute left-1/2 top-[18px] z-10 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-[#15122a]" />
      <div className="relative h-full overflow-hidden rounded-[36px] bg-white">
        <div className="scrollbar-none overflow-y-auto" style={{ width: 390, height: inner / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div className="pt-[38px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
