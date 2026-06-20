const CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/

export type YouTubeChannelLookup =
  | { kind: 'id'; channelId: string }
  | { kind: 'handle'; handle: string }

export function parseYouTubeChannelInput(
  input: string,
): YouTubeChannelLookup | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const atMatch = trimmed.match(/@([\w.-]+)/)
  if (atMatch) {
    return { kind: 'handle', handle: atMatch[1] }
  }

  const channelMatch = trimmed.match(/channel\/(UC[\w-]+)/i)
  if (channelMatch) {
    return { kind: 'id', channelId: channelMatch[1] }
  }

  const customMatch = trimmed.match(/\/c\/([\w.-]+)/i)
  if (customMatch) {
    return { kind: 'handle', handle: customMatch[1] }
  }

  if (CHANNEL_ID_PATTERN.test(trimmed)) {
    return { kind: 'id', channelId: trimmed }
  }

  if (/^@?[\w.-]+$/.test(trimmed)) {
    return { kind: 'handle', handle: trimmed.replace(/^@/, '') }
  }

  return { kind: 'handle', handle: trimmed }
}
