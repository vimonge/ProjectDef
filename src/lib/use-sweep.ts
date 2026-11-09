/**
 * Microphone control for the voice sweep.
 *
 * Wraps expo-speech-recognition so the screen only deals with
 * "listening or not", the words being heard right now, and each finished
 * stretch of speech. Android runs continuous mode as a series of segments
 * and can end a session on its own after silence, so this restarts it
 * until the user presses stop.
 */

import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { ISSUES, TRADES } from './library';

/** Recognition language. Australian English suits site vocabulary; change here to try another. */
export const SWEEP_LANG = 'en-AU';

/** Errors that will not fix themselves by trying again. */
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'language-not-supported', 'audio-capture']);

const MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone permission is off. Turn it on in the phone settings for this app.',
  'service-not-allowed': 'Speech recognition is not available on this phone.',
  'language-not-supported': 'This phone has no speech model for Australian English yet.',
  'audio-capture': 'The microphone could not be opened. Is another app using it?',
  network: 'No signal for online recognition. Download the offline voice pack to work without it.',
};

/** Words the recogniser should favour: issue names and trades. */
const HINTS = [...ISSUES.map((i) => i.name.toLowerCase()), ...TRADES.map((t) => t.name.toLowerCase())];

export type OfflineState = 'unknown' | 'ready' | 'missing' | 'unsupported';

/** Is the Australian English voice pack on this phone, so recognition works without signal? */
async function probeOffline(): Promise<OfflineState> {
  try {
    // iOS and web manage their own models; only Android needs a downloaded pack.
    if (Platform.OS !== 'android' || !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      return 'unsupported';
    }
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    return locales.installedLocales.includes(SWEEP_LANG) ? 'ready' : 'missing';
  } catch {
    return 'unsupported';
  }
}

export function useSweep(onHeard: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<OfflineState>('unknown');
  const [available] = useState(() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      // Native module missing (Expo Go) or browser without speech support.
      return false;
    }
  });

  /** True from pressing start until pressing stop, even across automatic restarts. */
  const wanted = useRef(false);
  const onDevice = useRef(false);
  const onHeardRef = useRef(onHeard);
  useEffect(() => {
    onHeardRef.current = onHeard;
  }, [onHeard]);

  const checkOffline = useCallback(async () => {
    const state = await probeOffline();
    onDevice.current = state === 'ready';
    setOffline(state);
  }, []);

  useEffect(() => {
    if (available) {
      void probeOffline().then((state) => {
        onDevice.current = state === 'ready';
        setOffline(state);
      });
    }
    return () => {
      wanted.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // recogniser was never started
      }
    };
  }, [available]);

  const begin = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: SWEEP_LANG,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: onDevice.current,
      // Punctuation gives the parser sentence breaks; Android only adds it on-device.
      addsPunctuation: onDevice.current,
      contextualStrings: HINTS,
    });
  }, []);

  useSpeechRecognitionEvent('start', () => setListening(true));

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setInterim('');
      if (text.trim()) onHeardRef.current(text);
    } else {
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Silence and our own stop are normal; anything else is worth showing.
    if (event.error === 'aborted' || event.error === 'no-speech' || event.error === 'speech-timeout') return;
    if (FATAL.has(event.error)) wanted.current = false;
    setError(MESSAGES[event.error] ?? `Speech recognition stopped (${event.error}).`);
  });

  useSpeechRecognitionEvent('end', () => {
    setInterim('');
    if (wanted.current) {
      // Session ended on its own (usually a long pause): pick up again.
      setTimeout(() => {
        if (wanted.current) begin();
      }, 250);
    } else {
      setListening(false);
    }
  });

  const start = useCallback(async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError(MESSAGES['not-allowed']);
      return;
    }
    wanted.current = true;
    begin();
  }, [begin]);

  const stop = useCallback(() => {
    wanted.current = false;
    // stop() lets the last few words come through as a final result.
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const downloadOffline = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: SWEEP_LANG });
      await checkOffline();
    } catch {
      setError('The offline voice pack could not be downloaded. Try again on Wi-Fi.');
    }
  }, [checkOffline]);

  return { available, listening, interim, error, offline, start, stop, downloadOffline, recheckOffline: checkOffline };
}
