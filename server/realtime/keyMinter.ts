import { createHash } from 'node:crypto';
import OpenAI from 'openai';

export interface MintedKey {
  value: string;
  expiresAt: number;
}

export interface KeyMinter {
  mint(session: object, sessionId: string): Promise<MintedKey>;
}

export class MintError extends Error {
  constructor(
    readonly code: 'openai_auth' | 'openai_unavailable' | 'openai_rejected' | 'no_api_key',
    message: string,
  ) {
    super(message);
  }
}

/** Mints a short-lived (10 min) realtime client secret. The real API key never leaves the server. */
export class SessionKeyMinter implements KeyMinter {
  private readonly client: OpenAI | null;

  constructor(apiKey: string) {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async mint(session: object, sessionId: string): Promise<MintedKey> {
    if (!this.client) throw new MintError('no_api_key', 'OPENAI_API_KEY is not set in .env');
    // Random per-session safety identifier: never linked to a child.
    const safetyId = createHash('sha256').update(sessionId).digest('hex');
    try {
      const res = await this.client.realtime.clientSecrets.create(
        {
          expires_after: { anchor: 'created_at', seconds: 600 },
          session: session as never,
        },
        { headers: { 'OpenAI-Safety-Identifier': safetyId } },
      );
      return { value: res.value, expiresAt: res.expires_at };
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        if (err.status === 401 || err.status === 403) {
          throw new MintError('openai_auth', `OpenAI rejected the API key or project (${err.status}).`);
        }
        if (err.status && err.status >= 400 && err.status < 500) {
          throw new MintError('openai_rejected', `OpenAI rejected the session config (${err.status}): ${err.message}`);
        }
      }
      throw new MintError('openai_unavailable', 'Could not reach OpenAI. Check the internet connection.');
    }
  }
}
