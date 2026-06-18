import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

@Injectable()
export class TokenCryptoService {
  private readonly key: Buffer

  constructor() {
    const raw = process.env.TOKEN_ENCRYPTION_KEY
    if (!raw) {
      throw new Error('TOKEN_ENCRYPTION_KEY is required')
    }
    this.key = Buffer.from(raw, 'base64')

    if (this.key.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
  }

  decrypt(payload: string): string {
    const buffer = Buffer.from(payload, 'base64')
    const iv = buffer.subarray(0, IV_LENGTH)
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8')
  }
}
