export type VkGroupLookup =
  | { kind: 'id'; groupId: string }
  | { kind: 'screen_name'; screenName: string }

const NUMERIC_GROUP_ID = /^\d+$/

export function parseVkGroupInput(input: string): VkGroupLookup | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?vk\.(?:com|ru)\/(club|public|event)?(\d+|[\w.-]+)/i,
  )
  if (urlMatch) {
    const [, prefix, slug] = urlMatch
    if (prefix && NUMERIC_GROUP_ID.test(slug)) {
      return { kind: 'id', groupId: slug }
    }
    if (NUMERIC_GROUP_ID.test(slug)) {
      return { kind: 'id', groupId: slug }
    }
    return { kind: 'screen_name', screenName: slug }
  }

  if (NUMERIC_GROUP_ID.test(trimmed)) {
    return { kind: 'id', groupId: trimmed }
  }

  if (/^[\w.-]+$/.test(trimmed)) {
    return { kind: 'screen_name', screenName: trimmed }
  }

  return null
}

export function vkGroupPollInput(lookup: VkGroupLookup): string {
  return lookup.kind === 'id' ? lookup.groupId : lookup.screenName
}
