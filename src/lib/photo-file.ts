/**
 * Where photos live.
 *
 * The camera writes to a temporary cache folder that the phone may clear
 * when storage runs low, which on a multi-day job would lose evidence. Each
 * photo is moved into the app's own document folder, under its room.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Move a freshly taken photo into permanent storage and return its new uri.
 * On the web the camera hands back a data uri, which is already self-contained.
 */
export function keepPhoto(tempUri: string, roomId: string, photoId: string): string {
  if (Platform.OS === 'web') return tempUri;
  try {
    const dir = new Directory(Paths.document, 'photos', roomId);
    if (!dir.exists) dir.create({ intermediates: true });
    const source = new File(tempUri);
    const dest = new File(dir, `${photoId}.jpg`);
    source.moveSync(dest);
    return dest.uri;
  } catch {
    // Keep the cache copy rather than losing the photo; it is still usable today.
    return tempUri;
  }
}
