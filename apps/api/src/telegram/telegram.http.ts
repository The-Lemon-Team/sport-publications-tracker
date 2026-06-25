import * as http from 'node:http'
import * as net from 'node:net'
import * as tls from 'node:tls'
import { URL } from 'node:url'

export class TelegramNetworkError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'TelegramNetworkError'
  }
}

function isNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.message === 'fetch failed') return true
  const code = (error as NodeJS.ErrnoException).code
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN'
  )
}

export function wrapTelegramNetworkError(error: unknown): TelegramNetworkError {
  if (error instanceof TelegramNetworkError) return error

  if (isNetworkFetchError(error)) {
    const cause = error instanceof Error ? error.cause ?? error : error
    return new TelegramNetworkError(
      'Unable to reach Telegram API. The host may be blocked on this network.',
      cause,
    )
  }

  if (error instanceof Error) {
    return new TelegramNetworkError(error.message, error)
  }

  return new TelegramNetworkError('Unable to reach Telegram API')
}

function isSocksProxy(protocol: string): boolean {
  return protocol === 'socks5:' || protocol === 'socks5h:' || protocol === 'socks:'
}

function proxyPort(proxy: URL, fallbackHttp: number, fallbackSocks: number): number {
  if (proxy.port) return Number(proxy.port)
  if (isSocksProxy(proxy.protocol)) return fallbackSocks
  return proxy.protocol === 'https:' ? 443 : fallbackHttp
}

export async function httpGetText(
  target: URL,
  proxyUrl?: string | null,
): Promise<string> {
  const trimmedProxy = proxyUrl?.trim()
  if (!trimmedProxy) {
    try {
      const response = await fetch(target)
      return response.text()
    } catch (error) {
      throw wrapTelegramNetworkError(error)
    }
  }

  const proxy = new URL(trimmedProxy)
  if (isSocksProxy(proxy.protocol)) {
    const socket = await openSocks5Tunnel(target, proxy)
    return httpsGetTextOverSocket(target, socket)
  }

  if (proxy.protocol === 'http:' || proxy.protocol === 'https:') {
    return httpGetTextViaHttpProxy(target, proxy)
  }

  throw new TelegramNetworkError(
    'TELEGRAM_API_PROXY must be http://, https://, socks5:// or socks5h://',
  )
}

function httpsGetTextOverSocket(
  target: URL,
  socket: net.Socket,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect(
      {
        host: target.hostname,
        servername: target.hostname,
        socket,
      },
      () => {
        const path = `${target.pathname}${target.search}`
        tlsSocket.write(
          [
            `GET ${path} HTTP/1.1`,
            `Host: ${target.hostname}`,
            'Connection: close',
            'Accept: application/json',
            '',
            '',
          ].join('\r\n'),
        )
      },
    )

    let raw = ''
    tlsSocket.on('data', (chunk) => {
      raw += chunk.toString('utf8')
    })
    tlsSocket.on('error', (error) => {
      reject(wrapTelegramNetworkError(error))
    })
    tlsSocket.on('end', () => {
      try {
        resolve(parseHttpResponseBody(raw))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function parseHttpResponseBody(raw: string): string {
  const sep = raw.indexOf('\r\n\r\n')
  if (sep === -1) {
    throw new TelegramNetworkError('Invalid HTTP response from Telegram API')
  }

  const headerPart = raw.slice(0, sep)
  const body = raw.slice(sep + 4)
  const statusLine = headerPart.split('\r\n')[0] ?? ''
  const statusMatch = /HTTP\/\d\.\d (\d+)/.exec(statusLine)
  const status = statusMatch ? Number(statusMatch[1]) : 0

  if (status < 200 || status >= 300) {
    throw new TelegramNetworkError(
      `Telegram API HTTP error ${status || 'unknown'} via proxy`,
    )
  }

  return body
}

function httpGetTextViaHttpProxy(target: URL, proxy: URL): Promise<string> {
  const proxyPortNum = proxyPort(proxy, 80, 1080)

  const headers: Record<string, string> = {}
  if (proxy.username) {
    const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`
    headers['Proxy-Authorization'] = `Basic ${Buffer.from(auth).toString('base64')}`
  }

  return new Promise((resolve, reject) => {
    const connectReq = http.request({
      host: proxy.hostname,
      port: proxyPortNum,
      method: 'CONNECT',
      path: `${target.hostname}:443`,
      headers,
    })

    connectReq.on('error', (error) => {
      reject(wrapTelegramNetworkError(error))
    })

    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy()
        reject(
          new TelegramNetworkError(
            `Proxy CONNECT failed with HTTP ${res.statusCode ?? 'unknown'}`,
          ),
        )
        return
      }

      httpsGetTextOverSocket(target, socket).then(resolve).catch(reject)
    })

    connectReq.end()
  })
}

function openSocks5Tunnel(target: URL, proxy: URL): Promise<net.Socket> {
  const proxyPortNum = proxyPort(proxy, 8080, 1080)
  const username = proxy.username
    ? decodeURIComponent(proxy.username)
    : null
  const password = proxy.password ? decodeURIComponent(proxy.password) : ''

  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPortNum, proxy.hostname)

    const fail = (error: unknown) => {
      socket.destroy()
      reject(
        error instanceof TelegramNetworkError
          ? error
          : wrapTelegramNetworkError(error),
      )
    }

    socket.once('error', fail)

    socket.once('connect', () => {
      const authMethod = username ? 0x02 : 0x00
      socket.write(Buffer.from([0x05, 0x01, authMethod]))

      let stage: 'greeting' | 'auth' | 'connect' | 'done' = 'greeting'
      let buffer = Buffer.alloc(0)

      const onData = (chunk: Buffer) => {
        if (stage === 'done') return
        buffer = Buffer.concat([buffer, chunk])

        if (stage === 'greeting') {
          if (buffer.length < 2) return
          if (buffer[0] !== 0x05) {
            fail(new TelegramNetworkError('SOCKS5 greeting failed'))
            return
          }

          const selected = buffer[1]
          buffer = buffer.subarray(2)

          if (selected === 0xff) {
            fail(new TelegramNetworkError('SOCKS5 proxy rejected all auth methods'))
            return
          }

          if (selected === 0x02) {
            if (!username) {
              fail(new TelegramNetworkError('SOCKS5 proxy requires authentication'))
              return
            }
            stage = 'auth'
            const userBuf = Buffer.from(username, 'utf8')
            const passBuf = Buffer.from(password, 'utf8')
            socket.write(
              Buffer.concat([
                Buffer.from([0x01, userBuf.length]),
                userBuf,
                Buffer.from([passBuf.length]),
                passBuf,
              ]),
            )
            return
          }

          stage = 'connect'
          sendSocks5Connect()
          return
        }

        if (stage === 'auth') {
          if (buffer.length < 2) return
          if (buffer[0] !== 0x01 || buffer[1] !== 0x00) {
            fail(new TelegramNetworkError('SOCKS5 authentication failed'))
            return
          }
          buffer = buffer.subarray(2)
          stage = 'connect'
          sendSocks5Connect()
          return
        }

        if (stage === 'connect') {
          if (buffer.length < 4) return
          if (buffer[0] !== 0x05) {
            fail(new TelegramNetworkError('Invalid SOCKS5 connect response'))
            return
          }
          if (buffer[1] !== 0x00) {
            fail(
              new TelegramNetworkError(
                `SOCKS5 connect failed with code ${buffer[1]}`,
              ),
            )
            return
          }

          const atyp = buffer[3]
          let headerLen = 4
          if (atyp === 0x01) headerLen = 10
          else if (atyp === 0x03) {
            if (buffer.length < 5) return
            headerLen = 5 + buffer[4]
          } else if (atyp === 0x04) headerLen = 22
          else {
            fail(new TelegramNetworkError('Unsupported SOCKS5 address type'))
            return
          }

          if (buffer.length < headerLen) return

          stage = 'done'
          socket.off('data', onData)
          const leftover = buffer.subarray(headerLen)
          if (leftover.length > 0) {
            socket.unshift(leftover)
          }
          resolve(socket)
        }
      }

      const sendSocks5Connect = () => {
        const host = target.hostname
        const hostBuf = Buffer.from(host, 'utf8')
        const port = target.port ? Number(target.port) : 443
        socket.write(
          Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
            hostBuf,
            Buffer.from([(port >> 8) & 0xff, port & 0xff]),
          ]),
        )
      }

      socket.on('data', onData)
    })
  })
}
