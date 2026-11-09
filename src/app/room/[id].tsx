import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefectEditor } from '@/components/defect-editor';
import { UNASSIGNED_TRADE } from '@/lib/library';
import { formatTitle, parseUtterance } from '@/lib/parser';
import { useStore, type Defect } from '@/lib/store';
import { C, TOUCH } from '@/lib/theme';
import { useSweep } from '@/lib/use-sweep';

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function SweepScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const room = useStore((s) => s.rooms.find((r) => r.id === id));
  const allDefects = useStore((s) => s.defects);
  const addDefects = useStore((s) => s.addDefects);
  const updateDefect = useStore((s) => s.updateDefect);
  const removeDefect = useStore((s) => s.removeDefect);

  const defects = allDefects.filter((d) => d.roomId === id).sort((a, b) => a.seq - b.seq);

  const [editing, setEditing] = useState<Defect | null>(null);
  const [typed, setTyped] = useState('');
  const [seconds, setSeconds] = useState(0);
  const listRef = useRef<FlatList<Defect>>(null);

  const onHeard = useCallback(
    (text: string) => {
      if (id) addDefects(id, parseUtterance(text));
    },
    [addDefects, id],
  );

  const sweep = useSweep(onHeard);

  // Count up only while the microphone is open.
  useEffect(() => {
    if (!sweep.listening) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [sweep.listening]);

  // Keep the newest draft in view while talking.
  useEffect(() => {
    if (defects.length > 0) listRef.current?.scrollToEnd({ animated: true });
  }, [defects.length]);

  if (!room) {
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missingText}>This room is no longer in the list.</Text>
        <Pressable onPress={() => router.back()} style={styles.missingButton} accessibilityRole="button">
          <Text style={styles.missingButtonText}>Back to rooms</Text>
        </Pressable>
      </View>
    );
  }

  const submitTyped = () => {
    const text = typed.trim();
    if (!text) return;
    addDefects(room.id, parseUtterance(text));
    setTyped('');
  };

  const shareList = () => {
    const lines = defects.map((d) => {
      const trade = d.trade === UNASSIGNED_TRADE ? '' : ` (${d.trade})`;
      return `${formatTitle(room.number, d.issue, d.detail)}${trade}`;
    });
    void Share.share({ message: lines.join('\n') });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to rooms"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={22} color={C.onInk} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Voice sweep</Text>
          <Text style={styles.title}>Room {room.number}</Text>
        </View>
        {room.type ? (
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>{room.type}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={shareList}
          disabled={defects.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Share this room's defect list"
          style={({ pressed }) => [styles.headerButton, defects.length === 0 && styles.disabled, pressed && styles.pressed]}>
          <Feather name="share-2" size={20} color={C.onInk} />
        </Pressable>
      </View>

      <View style={styles.listenCard}>
        <View style={styles.listenRow}>
          <View style={[styles.dot, sweep.listening ? styles.dotOn : styles.dotOff]} />
          <Text style={[styles.listenState, sweep.listening && styles.listenStateOn]}>
            {sweep.listening ? 'Listening' : seconds > 0 ? 'Paused' : 'Ready'}
          </Text>
          <Text style={styles.clock}>{clock(seconds)}</Text>
        </View>
        <Text style={styles.interim} numberOfLines={3}>
          {sweep.interim
            ? `“${sweep.interim}…”`
            : sweep.listening
              ? 'Say each defect, then pause or say “next”.'
              : 'Tap the microphone and talk through the room. Example: “paint marks behind entry door, painter”.'}
        </Text>
        {sweep.error ? <Text style={styles.error}>{sweep.error}</Text> : null}
        {!sweep.available ? (
          <Text style={styles.notice}>
            Voice is not available here, so type defects below instead. On a phone it needs the installed app, not
            Expo Go.
          </Text>
        ) : null}
        {sweep.available && sweep.offline === 'missing' ? (
          <View style={styles.offline}>
            <Text style={styles.offlineText}>Voice needs signal right now. Download the voice pack to work offline.</Text>
            <Pressable
              onPress={sweep.downloadOffline}
              accessibilityRole="button"
              style={({ pressed }) => [styles.offlineButton, pressed && styles.pressed]}>
              <Text style={styles.offlineButtonText}>Download</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Drafts · {defects.length}</Text>
        <Text style={styles.listHint}>Tap a draft to fix it</Text>
      </View>

      <FlatList
        ref={listRef}
        data={defects}
        keyExtractor={(d) => d.id}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>Drafts appear here as you talk.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEditing(item)}
            accessibilityRole="button"
            accessibilityHint="Opens the draft to edit or delete it"
            style={({ pressed }) => [styles.draft, pressed && styles.pressed]}>
            <View style={styles.seq}>
              <Text style={styles.seqText}>{item.seq}</Text>
            </View>
            <View style={styles.draftText}>
              <Text style={styles.draftTitle}>
                {item.issue}
                {item.detail ? ` — ${item.detail}` : ''}
              </Text>
              <Text style={styles.draftMeta}>
                {item.zone} · {item.trade}
              </Text>
            </View>
            <Feather name="edit-2" size={16} color={C.muted} />
          </Pressable>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.typeRow}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submitTyped}
            placeholder="Or type a defect"
            placeholderTextColor={C.muted}
            returnKeyType="done"
            autoCapitalize="none"
            style={styles.typeInput}
            accessibilityLabel="Type a defect"
          />
          <Pressable
            onPress={submitTyped}
            disabled={!typed.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add typed defect"
            style={({ pressed }) => [styles.typeAdd, !typed.trim() && styles.disabled, pressed && styles.pressed]}>
            <Feather name="plus" size={22} color={C.ink} />
          </Pressable>
        </View>

        <Pressable
          onPress={sweep.listening ? sweep.stop : sweep.start}
          disabled={!sweep.available}
          accessibilityRole="button"
          accessibilityLabel={sweep.listening ? 'Stop listening' : 'Start listening'}
          style={({ pressed }) => [
            styles.mic,
            sweep.listening && styles.micOn,
            !sweep.available && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Feather name={sweep.listening ? 'square' : 'mic'} size={24} color={C.onInk} />
          <Text style={styles.micText}>{sweep.listening ? 'Stop' : seconds > 0 ? 'Resume sweep' : 'Start sweep'}</Text>
        </Pressable>
      </View>

      {editing ? (
        <DefectEditor
          defect={editing}
          roomNumber={room.number}
          onClose={() => setEditing(null)}
          onSave={(edit) => {
            updateDefect(editing.id, edit);
            setEditing(null);
          }}
          onDelete={() => {
            removeDefect(editing.id);
            setEditing(null);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ground },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },

  header: {
    backgroundColor: C.ink,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
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
  title: { color: C.onInk, fontSize: 24, fontWeight: '700' },
  typeChip: { backgroundColor: C.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: C.ink },

  listenCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  listenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: C.rec },
  dotOff: { backgroundColor: C.lineStrong },
  listenState: { fontSize: 13, fontWeight: '600', color: C.muted },
  listenStateOn: { color: C.recText },
  clock: { marginLeft: 'auto', fontSize: 20, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] },
  interim: { fontSize: 15, lineHeight: 22, color: C.inkSoft },
  error: { fontSize: 14, lineHeight: 20, color: C.recText },
  notice: { fontSize: 14, lineHeight: 20, color: C.warnText },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnBg,
  },
  offlineText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.warnText },
  offlineButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineButtonText: { color: C.onInk, fontSize: 14, fontWeight: '600' },

  listHeader: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: '600', color: C.ink },
  listHint: { marginLeft: 'auto', fontSize: 12, color: C.muted },
  listFlex: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  empty: { fontSize: 15, color: C.muted, paddingHorizontal: 4, paddingTop: 4 },
  draft: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  seq: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  seqText: { color: C.onInk, fontSize: 13, fontWeight: '600' },
  draftText: { flex: 1, gap: 2 },
  draftTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  draftMeta: { fontSize: 13, color: C.muted },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeInput: {
    flex: 1,
    height: TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.lineStrong,
    paddingHorizontal: 12,
    fontSize: 16,
    color: C.ink,
  },
  typeAdd: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    height: 64,
    borderRadius: 16,
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  micOn: { backgroundColor: C.rec },
  micText: { color: C.onInk, fontSize: 18, fontWeight: '700' },

  missing: { alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  missingText: { fontSize: 16, color: C.ink },
  missingButton: { height: TOUCH, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.accent, justifyContent: 'center' },
  missingButtonText: { color: C.onInk, fontSize: 16, fontWeight: '600' },
});
