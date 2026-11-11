/**
 * Over-the-air updates.
 *
 * Code changes are published with `eas update` and the installed app picks
 * them up without reinstalling. Native changes (a new library such as the
 * camera) change the runtime fingerprint, so those updates are ignored by
 * older builds and a new build is needed instead — that is the point of the
 * fingerprint policy in app.json: a mismatched update can never reach a
 * build that lacks the native code it needs.
 */

import * as Updates from 'expo-updates';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

export type AppUpdate = {
  /** A new version has been downloaded and is waiting for a restart. */
  ready: boolean;
  /** Checking or downloading right now. */
  working: boolean;
  /** Short label for the running version, so a bug report can name it. */
  label: string;
  restart: () => void;
};

export function useAppUpdate(): AppUpdate {
  const { currentlyRunning, isUpdateAvailable, isUpdatePending, isChecking, isDownloading } =
    Updates.useUpdates();

  // expo-updates checks at launch on its own; this adds a check whenever the
  // app comes back to the front, so a sweep started later in the day is current.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      // No signal on site is normal and harmless: the app keeps the version it has.
      Updates.checkForUpdateAsync().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Download as soon as one is found, so the restart is instant when tapped.
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending && !isDownloading) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable, isUpdatePending, isDownloading]);

  const restart = useCallback(() => {
    Updates.reloadAsync().catch(() => {});
  }, []);

  let label: string;
  if (!Updates.isEnabled) {
    label = 'dev';
  } else if (currentlyRunning.isEmbeddedLaunch || !currentlyRunning.createdAt) {
    label = 'base build';
  } else {
    label = `updated ${currentlyRunning.createdAt.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    })}`;
  }

  return {
    ready: isUpdatePending,
    working: isChecking || isDownloading,
    label,
    restart,
  };
}
