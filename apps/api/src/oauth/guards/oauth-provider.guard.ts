import {
  type ExecutionContext,
  Injectable,
  mixin,
  type Type,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

export function OAuthProviderGuard(strategy: string): Type<unknown> {
  @Injectable()
  class MixinAuthGuard extends AuthGuard(strategy) {
    getAuthenticateOptions(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<{
        query?: { state?: string; code?: string }
      }>()
      if (request.query?.code) return {}
      const state = request.query?.state
      return state ? { state } : {}
    }
  }

  return mixin(MixinAuthGuard)
}
