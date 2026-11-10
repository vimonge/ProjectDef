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

/** Hiccups Android reports between segments; trying again normally clears them. */
const TRANSIENT = new Set(['client', 'busy']);
/** Give up after this many failures in a row with nothing heard in between. */
const MAX_FAILURES = 4;

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

type Handlers = {
  /** A finished piece of speech. Pieces end at short pauses, so one defect can arrive in several. */
  onHeard: (text: string) => void;
  /** The microphone has closed, after the last piece has been delivered. */
  onStopped: () => void;
};

export function useSweep({ onHeard, onStopped }: Handlers) {
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
  const failures = useRef(0);
  const onHeardRef = useRef(onHeard);
  const onStoppedRef = useRef(onStopped);
  useEffect(() => {
    onHeardRef.current = onHeard;
    onStoppedRef.current = onStopped;
  }, [onHeard, onStopped]);

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
      addsPunctuation: false,
      contextualStrings: HINTS,
    });
  }, []);

  useSpeechRecognitionEvent('start', () => setListening(true));

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    failures.current = 0;
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
    // Android often reports "client" as a session closes after Stop; nothing went wrong.
    if (!wanted.current && TRANSIENT.has(event.error)) return;
    failures.current += 1;
    if (TRANSIENT.has(event.error) && failures.current < MAX_FAILURES) return; // 'end' restarts it
    if (FATAL.has(event.error) || failures.current >= MAX_FAILURES) wanted.current = false;
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
      onStoppedRef.current();
    }
  });

  const start = useCallback(async () => {
    setError(null);
    failures.current = 0;
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
