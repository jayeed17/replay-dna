import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Card } from './cards'
import { CARD_H, CARD_W } from './StoryFrame'

/** Fits a 1080×1920 child into the available box. */
function useFitScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.3)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(Math.min(e.contentRect.width / CARD_W, e.contentRect.height / CARD_H)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return scale
}

interface Props {
  cards: Card[]
  /** Extra controls rendered under the card (e.g. export). Gets a getter for the current card's unscaled 1080×1920 DOM node. */
  actions?: (card: Card, getNode: () => HTMLDivElement | null) => ReactNode
}

export function StoryPlayer({ cards, actions }: Props) {
  const [[i, dir], setPos] = useState<[number, number]>([0, 0])
  const box = useRef<HTMLDivElement>(null)
  const scale = useFitScale(box)

  const go = useCallback((d: number) => setPos(([cur]) => [Math.max(0, Math.min(cards.length - 1, cur + d)), d]), [cards.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -400) go(1)
    else if (info.offset.x > 80 || info.velocity.x > 400) go(-1)
  }

  const card = cards[i]
  return (
    <section aria-roledescription="carousel" aria-label="Your story" className="flex h-full flex-col items-center gap-4">
      <div className="flex w-full max-w-[460px] gap-1" aria-hidden>
        {cards.map((c, k) => (
          <button key={c.id} tabIndex={-1} onClick={() => setPos([k, k > i ? 1 : -1])} className="h-1.5 flex-1 rounded-full bg-white/15">
            <span className={`block h-full rounded-full bg-white transition-all ${k <= i ? 'w-full' : 'w-0'}`} />
          </button>
        ))}
      </div>

      <div ref={box} className="relative w-full flex-1 overflow-hidden">
        <div className="absolute left-1/2 top-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50" style={{ width: CARD_W * scale, height: CARD_H * scale, transform: 'translateX(-50%)' }}>
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={card.id}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d >= 0 ? '100%' : '-100%', opacity: 0.4 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d >= 0 ? '-100%' : '100%', opacity: 0.4 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={onDragEnd}
              className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${cards.length}: ${card.title}`}
            >
              <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <div data-card={card.id}>{card.node}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* tap zones */}
          <button aria-label="Previous card" onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/4 focus:outline-none" />
          <button aria-label="Next card" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-1/4 focus:outline-none" />
        </div>
      </div>

      <div className="flex items-center gap-3 pb-2">
        <button onClick={() => go(-1)} disabled={i === 0} className="rounded-full bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-30">← Prev</button>
        <span className="w-20 text-center text-sm text-muted tabular-nums">{i + 1} / {cards.length}</span>
        <button onClick={() => go(1)} disabled={i === cards.length - 1} className="rounded-full bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-30">Next →</button>
        {actions?.(card, () => box.current?.querySelector<HTMLDivElement>(`[data-card="${CSS.escape(card.id)}"]`) ?? null)}
      </div>
    </section>
  )
}
