import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { VkGroupMetricsDto } from '@spt/shared'
import {
  parseVkGroupInput,
  vkGroupPollInput,
  type VkGroupLookup,
} from './vk-group.util'

const VK_API_VERSION = '5.199'

interface VkApiResponse<T> {
  response?: T
  error?: { error_code?: number; error_msg?: string }
}

interface VkGroupItem {
  id: number
  name?: string
  screen_name?: string
  members_count?: number
  is_closed?: number
}

@Injectable()
export class VkService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async getGroupMetrics(input: string): Promise<VkGroupMetricsDto> {
    const lookup = parseVkGroupInput(input)
    if (!lookup) {
      throw new BadRequestException('Invalid VK group URL or screen name')
    }

    const serviceToken = this.config.get<string>('VK_SERVICE_TOKEN')
    if (!serviceToken) {
      throw new ServiceUnavailableException('VK service token is not configured')
    }

    const group = await this.fetchGroup(lookup, serviceToken)
    if (!group) {
      throw new BadRequestException('VK group not found')
    }
    if (group.is_closed === 1) {
      throw new BadRequestException(
        'This VK group is closed — only open groups are supported without OAuth',
      )
    }

    const screenName = group.screen_name ?? String(group.id)
    return {
      groupId: String(group.id),
      title: group.name ?? null,
      handle: `vk.com/${screenName}`,
      subscriberCount: group.members_count ?? 0,
    }
  }

  private async fetchGroup(
    lookup: VkGroupLookup,
    accessToken: string,
  ): Promise<VkGroupItem | null> {
    const endpoint = new URL('https://api.vk.com/method/groups.getById')
    endpoint.searchParams.set('access_token', accessToken)
    endpoint.searchParams.set('v', VK_API_VERSION)
    endpoint.searchParams.set('fields', 'members_count,screen_name,is_closed')
    endpoint.searchParams.set('group_id', vkGroupPollInput(lookup))

    const response = await fetch(endpoint)
    const data = (await response.json()) as VkApiResponse<VkGroupItem[]>

    if (data.error) {
      if (data.error.error_code === 100) {
        throw new BadRequestException('VK group not found')
      }
      throw new ServiceUnavailableException(
        data.error.error_msg ?? 'VK API request failed',
      )
    }

    return data.response?.[0] ?? null
  }
}
