import { toBlob } from 'html-to-image'
import { CARD_H, CARD_W } from '../story/StoryFrame'

/** Renders a story card node to an exact 1080×1920 PNG, entirely in the browser. */
export async function cardToPng(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    width: CARD_W,
    height: CARD_H,
    pixelRatio: 1, // the card is already laid out at native IG-story pixels
    canvasWidth: CARD_W,
    canvasHeight: CARD_H,
    style: { transform: 'none' },
  })
  if (!blob) throw new Error('Could not render image')
  return blob
}

/** Share sheet on mobile (straight to IG Stories), plain download elsewhere. */
export async function saveOrShare(blob: Blob, fileName: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: 'image/png' })
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My Replay DNA' })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'shared'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
