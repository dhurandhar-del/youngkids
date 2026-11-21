import type { SdkSessionConfig } from '../../shared/types';
import { apiToolDefinitions } from '../../shared/tools';
import type { AppConfig } from '../config';

/** Builds the realtime session config in both shapes: API (for client_secrets) and Agents SDK (for the browser). */
export class SessionConfigFactory {
  constructor(private readonly cfg: AppConfig) {}

  sdkConfig(transcriptionPrompt: string): SdkSessionConfig {
    const c = this.cfg;
    return {
      model: c.realtimeModel,
      outputModalities: ['audio'],
      reasoning: { effort: c.reasoningEffort },
      audio: {
        input: {
          noiseReduction: c.noiseReduction === 'off' ? null : { type: c.noiseReduction },
          transcription: { model: c.transcribeModel, prompt: transcriptionPrompt },
          turnDetection: {
            type: 'semantic_vad',
            eagerness: c.vadEagerness,
            createResponse: true,
            interruptResponse: true,
          },
        },
        output: { voice: c.voice, speed: c.voiceSpeed },
      },
    };
  }

  apiSession(instructions: string, transcriptionPrompt: string) {
    const s = this.sdkConfig(transcriptionPrompt);
    return {
      type: 'realtime' as const,
      model: s.model,
      instructions,
      output_modalities: s.outputModalities,
      reasoning: s.reasoning,
      audio: {
        input: {
          noise_reduction: s.audio.input.noiseReduction,
          transcription: s.audio.input.transcription,
          turn_detection: {
            type: 'semantic_vad' as const,
            eagerness: s.audio.input.turnDetection.eagerness,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice: s.audio.output.voice, speed: s.audio.output.speed },
      },
      tools: apiToolDefinitions(),
      tool_choice: 'auto' as const,
      tracing: null,
    };
  }
}
