import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
  type RealtimeOutputGuardrail,
  type TransportEvent,
} from '@openai/agents/realtime';
import type { FunctionTool } from '@openai/agents/realtime';
import type { SessionBootstrap } from '@shared/types';

export interface VoiceHandlers {
  onTransportEvent(ev: TransportEvent & Record<string, unknown>): void;
  onGuardrailTripped(): void;
  onError(message: string, fatal: boolean): void;
  onRemoteStream(stream: MediaStream): void;
  onConnectionState(state: RTCPeerConnectionState): void;
}

/**
 * Thin wrapper over the Agents SDK RealtimeSession (WebRTC). Owns the <audio> element
 * that plays Zuzu's voice, and exposes the few raw events the Stage needs.
 */
export class RealtimeVoiceClient {
  readonly audioEl: HTMLAudioElement;
  private session: RealtimeSession | null = null;
  private transport: OpenAIRealtimeWebRTC | null = null;
  private pc: RTCPeerConnection | null = null;

  constructor() {
    this.audioEl = document.createElement('audio');
    this.audioEl.autoplay = true;
    this.audioEl.setAttribute('playsinline', '');
    document.body.appendChild(this.audioEl);
  }

  get connected(): boolean {
    return this.transport?.status === 'connected';
  }

  async connect(opts: {
    bootstrap: SessionBootstrap;
    micStream: MediaStream;
    tools: FunctionTool<any, any, any>[];
    guardrails: RealtimeOutputGuardrail[];
    handlers: VoiceHandlers;
  }): Promise<void> {
    const { bootstrap, micStream, tools, guardrails, handlers } = opts;

    this.transport = new OpenAIRealtimeWebRTC({
      audioElement: this.audioEl,
      mediaStream: micStream,
      changePeerConnection: (pc) => {
        this.pc = pc;
        pc.addEventListener('track', (e) => {
          if (e.track.kind === 'audio' && e.streams[0]) handlers.onRemoteStream(e.streams[0]);
        });
        pc.addEventListener('connectionstatechange', () => handlers.onConnectionState(pc.connectionState));
        return pc;
      },
    });

    const agent = new RealtimeAgent({
      name: bootstrap.buddyName,
      instructions: bootstrap.instructions,
      tools,
    });

    this.session = new RealtimeSession(agent, {
      transport: this.transport,
      model: bootstrap.model,
      config: bootstrap.config as never,
      outputGuardrails: guardrails,
      outputGuardrailSettings: { debounceTextLength: 100 },
      tracingDisabled: true,
      historyStoreAudio: false,
    });

    this.session.on('transport_event', (ev) => handlers.onTransportEvent(ev as TransportEvent & Record<string, unknown>));
    this.session.on('guardrail_tripped', () => handlers.onGuardrailTripped());
    this.session.on('error', (e) => {
      const err = (e as { error?: unknown }).error as { message?: string; error?: { message?: string } } | undefined;
      handlers.onError(err?.error?.message ?? err?.message ?? 'Realtime error', false);
    });

    await withTimeout(this.session.connect({ apiKey: bootstrap.clientSecret }), 15_000, 'Connecting to OpenAI timed out');
  }

  private send(event: Record<string, unknown>): void {
    if (this.transport?.status === 'connected') this.transport.sendEvent(event as never);
  }

  /** A hidden instruction from the app/facilitator (role: system). Optionally asks Zuzu to reply now. */
  addSystemNote(text: string, reply: boolean): void {
    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] },
    });
    if (reply) this.requestReply();
  }

  addImage(dataUrl: string, detail: 'low' | 'high', id: string): void {
    this.send({
      type: 'conversation.item.create',
      item: { id, type: 'message', role: 'user', content: [{ type: 'input_image', image_url: dataUrl, detail }] },
    });
  }

  deleteItem(id: string): void {
    this.send({ type: 'conversation.item.delete', item_id: id });
  }

  requestReply(): void {
    if (this.transport?.status === 'connected') this.transport.requestResponse();
  }

  interrupt(): void {
    this.session?.interrupt();
  }

  muteMic(muted: boolean): void {
    this.session?.mute(muted);
  }

  muteBuddy(muted: boolean): void {
    this.audioEl.muted = muted;
  }

  maxMessageBytes(): number {
    const size = this.pc?.sctp?.maxMessageSize;
    return size && Number.isFinite(size) && size > 0 ? Math.min(size, 256 * 1024) : 65536;
  }

  close(): void {
    try {
      this.session?.close();
    } catch {
      /* already closed */
    }
    this.session = null;
    this.transport = null;
    this.pc = null;
    this.audioEl.pause();
    this.audioEl.srcObject = null;
    this.audioEl.remove();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
