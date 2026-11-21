import type { ControlCommand, ControlMessage, StageEvent } from '@shared/types';

const CHANNEL = 'zuzu-control';

/** Console ⇄ Stage messaging between browser windows of the same origin. */
export class ControlBus {
  private readonly channel = new BroadcastChannel(CHANNEL);

  sendCommand(command: ControlCommand): void {
    this.channel.postMessage({ from: 'console', command } satisfies ControlMessage);
  }

  sendEvent(event: StageEvent): void {
    this.channel.postMessage({ from: 'stage', event } satisfies ControlMessage);
  }

  onCommand(handler: (c: ControlCommand) => void): () => void {
    const fn = (e: MessageEvent<ControlMessage>) => {
      if (e.data?.from === 'console') handler(e.data.command);
    };
    this.channel.addEventListener('message', fn);
    return () => this.channel.removeEventListener('message', fn);
  }

  onEvent(handler: (e: StageEvent) => void): () => void {
    const fn = (e: MessageEvent<ControlMessage>) => {
      if (e.data?.from === 'stage') handler(e.data.event);
    };
    this.channel.addEventListener('message', fn);
    return () => this.channel.removeEventListener('message', fn);
  }

  close(): void {
    this.channel.close();
  }
}
