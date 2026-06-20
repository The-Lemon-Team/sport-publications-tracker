export const INSTAGRAM_GRAPH_VERSION = 'v22.0'
export const INSTAGRAM_GRAPH_BASE = `https://graph.facebook.com/${INSTAGRAM_GRAPH_VERSION}`

const SHORTCODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function shortcodeToMediaId(shortcode: string): string {
  let id = 0n
  for (const char of shortcode) {
    const index = SHORTCODE_ALPHABET.indexOf(char)
    if (index < 0) {
      throw new Error('Invalid Instagram shortcode')
    }
    id = id * 64n + BigInt(index)
  }
  return id.toString()
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number }
}

export async function graphGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${INSTAGRAM_GRAPH_BASE}/${path.replace(/^\//, '')}`)
  url.searchParams.set('access_token', accessToken)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url)
  const data = (await response.json()) as T & GraphErrorBody

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Instagram Graph API request failed')
  }

  return data
}
