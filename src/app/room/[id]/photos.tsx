import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Markup } from '@/components/markup';
import { keepPhoto } from '@/lib/photo-file';
import { photosForDefect, useStore, type Photo } from '@/lib/store';
import { C, TOUCH } from '@/lib/theme';
import { walkOrder } from '@/lib/walk';

export default function PhotoPassScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const room = useStore((s) => s.rooms.find((r) => r.id === id));
  const allDefects = useStore((s) => s.defects);
  const allPhotos = useStore((s) => s.photos);
  const allMarks = useStore((s) => s.marks);
  const addPhoto = useStore((s) => s.addPhoto);
  const addMark = useStore((s) => s.addMark);
  const removeMark = useStore((s) => s.removeMark);
  const setMarkDefect = useStore((s) => s.setMarkDefect);

  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState(0);
  /** The photo just taken, shown for marking up. */
  const [marking, setMarking] = useState<Photo | null>(null);

  const drafts = useMemo(
    () => walkOrder(allDefects.filter((d) => d.roomId === id)),
    [allDefects, id],
  );

  const index = Math.min(at, Math.max(0, drafts.length - 1));
  const current = drafts[index];
  const marksOnPhoto = marking ? allMarks.filter((m) => m.photoId === marking.id) : [];

  const next = () => setAt((i) => Math.min(i + 1, drafts.length - 1));
  const prev = () => setAt((i) => Math.max(i - 1, 0));
  const done = (defectId: string) => photosForDefect(allPhotos, allMarks, defectId).length > 0;

  const shoot = async () => {
    if (!camera.current || !room || !current || busy || !ready) return;
    setBusy(true);
    try {
      // Compressed: a defect photo is looked at on a phone or in a report, not printed.
      const shot = await camera.current.takePictureAsync({ quality: 0.6 });
      if (!shot) return;
      const photo = addPhoto({
        roomId: room.id,
        defectId: current.id,
        uri: shot.uri,
        width: shot.width,
        height: shot.height,
      });
      // Move it out of the camera's cache, which the phone may clear.
      const kept = keepPhoto(shot.uri, room.id, photo.id);
      const stored = { ...photo, uri: kept };
      if (kept !== shot.uri) useStore.setState((s) => ({ photos: s.photos.map((p) => (p.id === photo.id ? stored : p)) }));
      setMarking(stored);
    } finally {
      setBusy(false);
    }
  };

  const closeMarkup = (advance: boolean) => {
    setMarking(null);
    if (advance) next();
  };

  const retake = () => {
    if (!marking) return;
    // Drop the photo and its circles; the camera comes straight back.
    useStore.setState((s) => ({
      photos: s.photos.filter((p) => p.id !== marking.id),
      marks: s.marks.filter((m) => m.photoId !== marking.id),
    }));
    setMarking(null);
  };

  if (!room) {
    return (
      <View style={[styles.screen, styles.centre, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.message}>This room is no longer in the list.</Text>
        <Pressable onPress={() => router.back()} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to the sweep"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={22} color={C.onInk} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Photo pass</Text>
          <Text style={styles.title}>Room {room.number}</Text>
        </View>
        <Text style={styles.count}>
          {drafts.length === 0 ? '0' : `${index + 1} of ${drafts.length}`}
        </Text>
      </View>

      {drafts.length === 0 ? (
        <View style={[styles.centre, styles.pad]}>
          <Text style={styles.message}>
            No drafts yet. Go back and talk through the room first, then come here to photograph each one.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Back to the sweep</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.currentCard}>
            <Pressable
              onPress={prev}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Previous draft"
              style={({ pressed }) => [styles.step, index === 0 && styles.disabled, pressed && styles.pressed]}>
              <Feather name="chevron-left" size={20} color={C.onInk} />
            </Pressable>
            <View style={styles.currentText}>
              <Text style={styles.currentEyebrow}>{done(current.id) ? 'Has a photo' : 'Now shooting'}</Text>
              <Text style={styles.currentTitle} numberOfLines={2}>
                {current.issue}
                {current.detail ? ` — ${current.detail}` : ''}
              </Text>
              <Text style={styles.currentMeta}>
                {current.zone} · {current.trade}
              </Text>
            </View>
            <Pressable
              onPress={next}
              disabled={index >= drafts.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Next draft"
              style={({ pressed }) => [
                styles.step,
                index >= drafts.length - 1 && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Feather name="chevron-right" size={20} color={C.onInk} />
            </Pressable>
          </View>

          <View style={styles.preview}>
            {permission?.granted ? (
              <CameraView
                ref={camera}
                style={StyleSheet.absoluteFill}
                facing="back"
                onCameraReady={() => setReady(true)}
              />
            ) : (
              <View style={[styles.centre, styles.pad]}>
                <Text style={styles.message}>
                  {permission
                    ? 'ProjectDef needs the camera to photograph defects.'
                    : 'Checking the camera…'}
                </Text>
                {permission && !permission.granted ? (
                  <Pressable onPress={requestPermission} style={styles.primary} accessibilityRole="button">
                    <Text style={styles.primaryText}>Allow camera</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <View style={styles.strip}>
            {drafts.map((d, i) => {
              const hasPhoto = done(d.id);
              const isNow = i === index;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setAt(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Draft ${i + 1}${hasPhoto ? ', has a photo' : ''}`}
                  style={[styles.chip, hasPhoto && styles.chipDone, isNow && styles.chipNow]}>
                  {hasPhoto ? (
                    <Feather name="check" size={16} color={isNow ? C.ink : C.chip} />
                  ) : (
                    <Text style={[styles.chipText, isNow && styles.chipTextNow]}>{i + 1}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <Pressable
              onPress={next}
              disabled={index >= drafts.length - 1}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondary,
                index >= drafts.length - 1 && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.secondaryText}>Skip photo</Text>
            </Pressable>

            <Pressable
              onPress={shoot}
              disabled={!permission?.granted || !ready || busy}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              style={({ pressed }) => [
                styles.shutter,
                (!permission?.granted || !ready || busy) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <View style={styles.shutterInner} />
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Feather name="mic" size={16} color={C.onInk} />
              <Text style={styles.secondaryText}>New find</Text>
            </Pressable>
          </View>
        </>
      )}

      {marking && current ? (
        <Markup
          photo={marking}
          marks={marksOnPhoto}
          currentDefect={current}
          defects={drafts}
          onAddMark={(defectId, rect) => addMark(marking.id, defectId, rect)}
          onRemoveMark={removeMark}
          onSetMarkDefect={setMarkDefect}
          onRetake={retake}
          onDone={() => closeMarkup(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E0F12' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  pad: { paddingHorizontal: 24 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.35 },
  message: { color: C.onInk, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  primary: {
    height: TOUCH,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: C.onInk, fontSize: 16, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  eyebrow: { color: C.onInkMuted, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: C.onInk, fontSize: 22, fontWeight: '700' },
  count: { color: C.onInk, fontSize: 16, fontWeight: '600' },

  currentCard: {
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 14,
    backgroundColor: C.inkRaised,
    borderWidth: 1,
    borderColor: C.inkLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#262931', alignItems: 'center', justifyContent: 'center' },
  currentText: { flex: 1, gap: 2 },
  currentEyebrow: { color: C.chip, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  currentTitle: { color: C.onInk, fontSize: 18, fontWeight: '600' },
  currentMeta: { color: C.onInkMuted, fontSize: 13 },

  preview: { flex: 1, margin: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1B1D23' },

  strip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipDone: { backgroundColor: '#14532D' },
  chipNow: { borderColor: C.chip, backgroundColor: C.chip },
  chipText: { color: C.onInkMuted, fontSize: 15, fontWeight: '600' },
  chipTextNow: { color: C.ink, fontWeight: '700' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  secondary: {
    minWidth: 96,
    height: TOUCH,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inkLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: { color: C.onInk, fontSize: 14, fontWeight: '600' },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: C.onInk,
    padding: 5,
  },
  shutterInner: { flex: 1, borderRadius: 40, backgroundColor: C.onInk },
});
