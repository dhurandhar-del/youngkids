/** One webcam stream shared by MediaPipe, the preview and snapshots. Frames are never stored. */
export class CameraService {
  readonly video: HTMLVideoElement;
  stream: MediaStream | null = null;
  private readonly canvas = document.createElement('canvas');

  constructor() {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
  }

  get on(): boolean {
    return Boolean(this.stream?.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled));
  }

  async start(): Promise<void> {
    if (this.on) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  /** JPEG data URL of the current frame, centre-cropped to width×height, or null if not ready. */
  snapshot(width: number, height: number, quality: number): string | null {
    const v = this.video;
    if (!this.on || v.readyState < 2 || !v.videoWidth) return null;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;
    const target = width / height;
    const srcRatio = v.videoWidth / v.videoHeight;
    let sw = v.videoWidth;
    let sh = v.videoHeight;
    if (srcRatio > target) sw = sh * target;
    else sh = sw / target;
    const sx = (v.videoWidth - sw) / 2;
    const sy = (v.videoHeight - sh) / 2;
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, width, height);
    return this.canvas.toDataURL('image/jpeg', quality);
  }
}
