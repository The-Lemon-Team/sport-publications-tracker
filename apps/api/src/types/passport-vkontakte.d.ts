declare module 'passport-vkontakte' {
  import type { Strategy as PassportStrategy } from 'passport'

  export interface Profile {
    id: string
    displayName: string
    _json: Record<string, unknown>
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: {
        clientID: string
        clientSecret: string
        callbackURL: string
        scope?: string[]
        profileFields?: string[]
        state?: boolean
      },
      verify: (
        accessToken: string,
        refreshToken: string,
        params: { expires_in?: number },
        profile: Profile,
        done: (error: Error | null, user?: unknown) => void,
      ) => void,
    )
  }
}
