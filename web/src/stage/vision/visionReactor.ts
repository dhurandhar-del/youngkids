import { FaceLandmarker, FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

export type Reaction =
  | { kind: 'face'; present: boolean }
  | { kind: 'smile'; on: boolean }
  | { kind: 'gesture'; name: 'wave' | 'thumbs_up' | 'point' | 'victory' };

const WASM_PATH = '/vendor/mediapipe-wasm';
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const GESTURE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const GESTURES: Record<string, Reaction & { kind: 'gesture' }> = {
  Open_Palm: { kind: 'gesture', name: 'wave' },
  Thumb_Up: { kind: 'gesture', name: 'thumbs_up' },
  Pointing_Up: { kind: 'gesture', name: 'point' },
  Victory: { kind: 'gesture', name: 'victory' },
};

/**
 * On-device reactions (LLD §11.3): face present, smile (for a neutral "smile back" only, never
 * logged or sent anywhere), and a few hand gestures. Runs ~12 fps; frames never leave the laptop.
 */
export class VisionReactor {
  private face: FaceLandmarker | null = null;
  private gestures: GestureRecognizer | null = null;
  private raf = 0;
  private lastVideoTime = -1;
  private lastRun = 0;
  private frame = 0;
  private faceSince = 0;
  private noFaceSince = 0;
  private present = false;
  private smiling = false;
  private lastGestureAt = 0;
  private handlers = new Set<(r: Reaction) => void>();
  ready = false;

  async init(): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    this.face = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
    try {
      this.gestures = await GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: GESTURE_MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    } catch {
      this.gestures = null; // gestures are a nice-to-have
    }
    this.ready = true;
  }

  onReaction(handler: (r: Reaction) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  start(video: HTMLVideoElement): void {
    this.stop();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - this.lastRun < 80) return; // ~12 fps
      if (!this.face || video.readyState < 2 || video.currentTime === this.lastVideoTime) return;
      this.lastRun = now;
      this.lastVideoTime = video.currentTime;
      try {
        this.process(video, now);
      } catch {
        /* a dropped frame is fine */
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.present) this.emit({ kind: 'face', present: false });
    this.present = false;
    this.smiling = false;
    this.faceSince = this.noFaceSince = 0;
  }

  private process(video: HTMLVideoElement, now: number): void {
    const r = this.face!.detectForVideo(video, now);
    const hasFace = r.faceLandmarks.length > 0;

    if (hasFace) {
      this.noFaceSince = 0;
      this.faceSince ||= now;
      if (!this.present && now - this.faceSince >= 500) {
        this.present = true;
        this.emit({ kind: 'face', present: true });
      }
      const cats = r.faceBlendshapes?.[0]?.categories ?? [];
      const score = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? 0;
      const smile = (score('mouthSmileLeft') + score('mouthSmileRight')) / 2;
      const next = this.smiling ? smile > 0.35 : smile > 0.55;
      if (next !== this.smiling) {
        this.smiling = next;
        this.emit({ kind: 'smile', on: next });
      }
    } else {
      this.faceSince = 0;
      this.noFaceSince ||= now;
      if (this.present && now - this.noFaceSince >= 3000) {
        this.present = false;
        this.smiling = false;
        this.emit({ kind: 'face', present: false });
      }
    }

    if (this.gestures && ++this.frame % 3 === 0 && now - this.lastGestureAt > 4000) {
      const g = this.gestures.recognizeForVideo(video, now).gestures?.[0]?.[0];
      const reaction = g && g.score >= 0.7 ? GESTURES[g.categoryName] : undefined;
      if (reaction) {
        this.lastGestureAt = now;
        this.emit(reaction);
      }
    }
  }

  private emit(r: Reaction): void {
    this.handlers.forEach((h) => h(r));
  }

  dispose(): void {
    this.stop();
    this.face?.close();
    this.gestures?.close();
    this.face = this.gestures = null;
    this.ready = false;
  }
}
