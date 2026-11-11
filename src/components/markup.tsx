import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Defect, Mark, Photo } from '@/lib/store';
import { C, TOUCH } from '@/lib/theme';
import { dragToMark, fitRect, markToBox, type Rect } from '@/lib/walk';

type Props = {
  photo: Photo;
  /** Marks already on this photo. */
  marks: Mark[];
  /** The defect a new circle belongs to unless it is reassigned. */
  currentDefect: Defect;
  /** Every draft in the room, so a circle can be tied to a different one. */
  defects: Defect[];
  onAddMark: (defectId: string, rect: Rect) => void;
  onRemoveMark: (markId: string) => void;
  onSetMarkDefect: (markId: string, defectId: string) => void;
  onRetake: () => void;
  onDone: () => void;
};

const label = (d: Defect) => `${d.issue}${d.detail ? ` — ${d.detail}` : ''}`;

type Point = { x: number; y: number };

/**
 * Touch position inside the photo box.
 *
 * pageX/pageY are the one pair of coordinates both React Native and React
 * Native Web fill in reliably, so the box's own position on screen is
 * measured and subtracted rather than trusting locationX/locationY.
 */
const point = (e: GestureResponderEvent, origin: Point): Point => ({
  x: e.nativeEvent.pageX - origin.x,
  y: e.nativeEvent.pageY - origin.y,
});

const boundingBox = (a: Point, b: Point): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
});

/** StyleSheet.absoluteFillObject is not exported in this React Native version. */
const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/**
 * Circle what is wrong in the photo.
 *
 * Marks are kept as data rather than painted into the image, so a circle can
 * be moved or removed later and the original photo is never damaged.
 */
export function Markup({
  photo,
  marks,
  currentDefect,
  defects,
  onAddMark,
  onRemoveMark,
  onSetMarkDefect,
  onRetake,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const boxRef = useRef<ComponentRef<typeof View>>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** Where the photo box sits on screen, so page coordinates can be made local. */
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  /** Where the current drag began, in box coordinates. */
  const [start, setStart] = useState<Point | null>(null);
  /** The circle being dragged right now, in box coordinates. */
  const [drawing, setDrawing] = useState<Rect | null>(null);
  const [picking, setPicking] = useState<Mark | null>(null);

  const fit = useMemo(
    () => fitRect(photo.width, photo.height, box.w, box.h),
    [photo.width, photo.height, box.w, box.h],
  );

  const onBoxLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
    boxRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
  };

  const grant = (e: GestureResponderEvent) => {
    const p = point(e, origin);
    setStart(p);
    setDrawing({ ...p, w: 0, h: 0 });
  };

  const move = (e: GestureResponderEvent) => {
    if (!start) return;
    setDrawing(boundingBox(start, point(e, origin)));
  };

  const release = (e: GestureResponderEvent) => {
    if (start) {
      const rect = dragToMark(start, point(e, origin), fit);
      if (rect) onAddMark(currentDefect.id, rect);
    }
    setStart(null);
    setDrawing(null);
  };

  /** Which draft each circle belongs to, in the order they were drawn. */
  const legend = marks.map((mark, i) => ({
    mark,
    number: i + 1,
    defect: defects.find((d) => d.id === mark.defectId),
  }));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={onRetake}
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Text style={styles.headerButtonText}>Retake</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Circle the defect</Text>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <View
        ref={boxRef}
        style={styles.photoBox}
        onLayout={onBoxLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={grant}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={release}>
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="contain" pointerEvents="none" />

        {legend.map(({ mark, number }) => {
          const r = markToBox(mark, fit);
          return (
            <View key={mark.id} pointerEvents="none" style={[styles.mark, { left: r.x, top: r.y, width: r.w, height: r.h }]}>
              <View style={styles.markBadge}>
                <Text style={styles.markBadgeText}>{number}</Text>
              </View>
            </View>
          );
        })}

        {drawing ? (
          <View
            pointerEvents="none"
            style={[styles.mark, styles.drawing, { left: drawing.x, top: drawing.y, width: drawing.w, height: drawing.h }]}
          />
        ) : null}

        {marks.length === 0 && !drawing ? (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hint}>Drag a circle around the problem</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.tray, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.trayHead}>
          <Text style={styles.trayTitle}>
            {marks.length === 0
              ? 'No circles yet'
              : `${marks.length} circle${marks.length === 1 ? '' : 's'} on this photo`}
          </Text>
          <Pressable
            onPress={() => onRemoveMark(marks[marks.length - 1].id)}
            disabled={marks.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Undo last circle"
            style={({ pressed }) => [styles.undo, marks.length === 0 && styles.disabled, pressed && styles.pressed]}>
            <Feather name="corner-up-left" size={16} color={C.onInk} />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.legend} contentContainerStyle={styles.legendBody}>
          {legend.length === 0 ? (
            <Text style={styles.legendEmpty}>
              Circles are tied to {label(currentDefect)}. Draw another and tap it to tie it to a different draft.
            </Text>
          ) : (
            legend.map(({ mark, number, defect }) => (
              <Pressable
                key={mark.id}
                onPress={() => setPicking(mark)}
                accessibilityRole="button"
                accessibilityHint="Choose which draft this circle belongs to"
                style={({ pressed }) => [styles.legendRow, pressed && styles.pressed]}>
                <View style={styles.legendNumber}>
                  <Text style={styles.legendNumberText}>{number}</Text>
                </View>
                <Text style={styles.legendLabel} numberOfLines={2}>
                  {defect ? label(defect) : 'Draft deleted'}
                </Text>
                <Feather name="chevron-down" size={18} color={C.onInkMuted} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <Modal visible={picking !== null} transparent animationType="slide" onRequestClose={() => setPicking(null)}>
        <View style={styles.pickBackdrop}>
          <Pressable style={styles.pickDismiss} onPress={() => setPicking(null)} accessibilityLabel="Close" />
          <View style={[styles.pickSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.pickTitle}>This circle is</Text>
            <ScrollView contentContainerStyle={styles.pickBody}>
              {defects.map((d) => {
                const selected = picking?.defectId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      if (picking) onSetMarkDefect(picking.id, d.id);
                      setPicking(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.pickRow, selected && styles.pickRowSelected, pressed && styles.pressed]}>
                    <Text style={[styles.pickRowText, selected && styles.pickRowTextSelected]}>{label(d)}</Text>
                    {selected ? <Feather name="check" size={18} color={C.ink} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...fill, backgroundColor: '#0E0F12' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    height: TOUCH,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: { color: C.onInk, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', color: C.onInk, fontSize: 17, fontWeight: '600' },
  done: {
    height: TOUCH,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: C.onInk, fontSize: 16, fontWeight: '700' },

  photoBox: { flex: 1, backgroundColor: '#000000' },
  mark: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: C.rec,
    borderRadius: 9999,
  },
  drawing: { borderStyle: 'dashed' },
  markBadge: {
    position: 'absolute',
    top: -14,
    left: -14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.rec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBadgeText: { color: C.onInk, fontSize: 13, fontWeight: '700' },
  hintWrap: { ...fill, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 },
  hint: {
    color: C.onInk,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },

  tray: { maxHeight: 220, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  trayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trayTitle: { flex: 1, color: C.onInk, fontSize: 15, fontWeight: '600' },
  undo: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.inkRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  undoText: { color: C.onInk, fontSize: 14, fontWeight: '600' },
  legend: { flexGrow: 0 },
  legendBody: { gap: 8 },
  legendRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: C.inkRaised,
  },
  legendNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.rec, alignItems: 'center', justifyContent: 'center' },
  legendNumberText: { color: C.onInk, fontSize: 13, fontWeight: '700' },
  legendLabel: { flex: 1, color: C.onInk, fontSize: 15 },
  legendEmpty: { color: C.onInkMuted, fontSize: 14, lineHeight: 20 },

  pickBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,23,28,0.55)' },
  pickDismiss: { flex: 1 },
  pickSheet: { maxHeight: '70%', backgroundColor: C.ground, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
  pickTitle: { paddingHorizontal: 20, fontSize: 18, fontWeight: '700', color: C.ink },
  pickBody: { padding: 16, gap: 8 },
  pickRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  pickRowSelected: { borderColor: C.ink, borderWidth: 2 },
  pickRowText: { flex: 1, fontSize: 15, color: C.ink },
  pickRowTextSelected: { fontWeight: '700' },
});
