import { VoiceRecorder } from 'capacitor-voice-recorder';

/**
 * Checks and requests runtime audio recording permissions via Capacitor.
 * Ensures microphone permissions are requested on Android/Capacitor builds.
 */
export async function requestNativeAudioPermission(): Promise<boolean> {
  try {
    const check = await VoiceRecorder.hasAudioRecordingPermission();
    if (!check.value) {
      const req = await VoiceRecorder.requestAudioRecordingPermission();
      return req.value;
    }
    return true;
  } catch (e) {
    // Fallback for standard web environment where Capacitor plugin isn't active
    return true;
  }
}
