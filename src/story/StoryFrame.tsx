import type { ReactNode } from 'react'

export const CARD_W = 1080
export const CARD_H = 1920

const THEMES = {
  lime: 'linear-gradient(160deg,#1a2a00 0%,#0b0b12 55%,#2b3d00 100%)',
  pink: 'linear-gradient(160deg,#3a0022 0%,#0b0b12 55%,#4a0030 100%)',
  violet: 'linear-gradient(160deg,#1b0f4d 0%,#0b0b12 55%,#2a1670 100%)',
  cyan: 'linear-gradient(160deg,#002f3a 0%,#0b0b12 55%,#004252 100%)',
  sunset: 'linear-gradient(160deg,#4a1600 0%,#3a0022 50%,#1b0f4d 100%)',
} as const
export type Theme = keyof typeof THEMES
export const ACCENT: Record<Theme, string> = { lime: '#c6ff3d', pink: '#ff4fa3', violet: '#a18bff', cyan: '#3de0ff', sunset: '#ffb13d' }

/** A fixed 1080×1920 canvas. Everything inside is laid out in real IG-story pixels. */
export function StoryFrame({ theme, kicker, children }: { theme: Theme; kicker: string; children: ReactNode }) {
  return (
    <div
      style={{ width: CARD_W, height: CARD_H, background: THEMES[theme], fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}
      className="relative flex flex-col overflow-hidden px-[96px] pt-[220px] pb-[140px] text-white"
    >
      <p className="text-[38px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT[theme] }}>{kicker}</p>
      <div className="mt-[48px] flex flex-1 flex-col justify-center pb-[120px]">{children}</div>
      <p className="text-[30px] font-semibold tracking-wide text-white/50">
        Replay <span style={{ color: ACCENT[theme] }}>DNA</span>
      </p>
    </div>
  )
}
