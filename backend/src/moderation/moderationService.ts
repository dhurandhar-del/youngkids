import OpenAI from 'openai';
import type { ModerationVerdict } from '@zuzu/shared/types';

export interface Moderator {
  check(text: string): Promise<ModerationVerdict>;
}

/** Text moderation with omni-moderation-latest (free). Text is never logged or stored. */
export class ModerationService implements Moderator {
  private readonly client: OpenAI | null;

  constructor(apiKey: string) {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async check(text: string): Promise<ModerationVerdict> {
    if (!this.client) throw new Error('OPENAI_API_KEY is not set');
    const res = await this.client.moderations.create({ model: 'omni-moderation-latest', input: text.slice(0, 4000) });
    const result = res.results[0];
    const categories = Object.entries(result?.categories ?? {})
      .filter(([, on]) => on)
      .map(([name]) => name);
    return { flagged: Boolean(result?.flagged), categories };
  }
}
