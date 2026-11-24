import { useMemo } from 'react'
import type { Report } from '../analytics/report'
import { ExportButton } from '../export/ExportButton'
import { buildCards } from './cards'
import { StoryPlayer } from './StoryPlayer'

export default function StoryView({ r }: { r: Report }) {
  const cards = useMemo(() => buildCards(r), [r])
  return <StoryPlayer cards={cards} actions={(card, getNode) => <ExportButton key={card.id} id={card.id} getNode={getNode} />} />
}
