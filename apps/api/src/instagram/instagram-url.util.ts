const SHORTCODE_KINDS = new Set(['p', 'reel', 'reels', 'tv'])

export function extractInstagramShortcode(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(
      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    )
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'instagram.com') return null

    const segments = parsed.pathname.split('/').filter(Boolean)
    const kind = segments[0]?.toLowerCase()
    const shortcode = segments[1]?.split('?')[0]
    if (!kind || !shortcode || !SHORTCODE_KINDS.has(kind)) return null

    return shortcode
  } catch {
    return null
  }
}
