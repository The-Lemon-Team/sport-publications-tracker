const VIDEO_ID_PATTERN = /^[\w-]{11}$/

export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      return VIDEO_ID_PATTERN.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = parsed.searchParams.get('v')
      if (v && VIDEO_ID_PATTERN.test(v)) return v

      const segments = parsed.pathname.split('/').filter(Boolean)
      const kind = segments[0]
      const id = segments[1]
      if (
        id &&
        VIDEO_ID_PATTERN.test(id) &&
        (kind === 'shorts' || kind === 'live' || kind === 'embed')
      ) {
        return id
      }
    }
  } catch {
    return null
  }

  return null
}
