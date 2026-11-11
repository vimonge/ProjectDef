import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore, type Room } from '@/lib/store';
import { C, TOUCH } from '@/lib/theme';
import { useAppUpdate } from '@/lib/use-app-update';

const version = Constants.expoConfig?.version ?? '';

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const rooms = useStore((s) => s.rooms);
  const defects = useStore((s) => s.defects);
  const addRoom = useStore((s) => s.addRoom);
  const removeRoom = useStore((s) => s.removeRoom);

  const update = useAppUpdate();

  const [number, setNumber] = useState('');
  const [type, setType] = useState('');

  const trimmed = number.trim();
  const duplicate = rooms.some((r) => r.number.toLowerCase() === trimmed.toLowerCase());
  const canAdd = trimmed.length > 0 && !duplicate;

  const countFor = (roomId: string) => defects.filter((d) => d.roomId === roomId).length;

  const onAdd = () => {
    if (!canAdd) return;
    const room = addRoom(trimmed, type);
    setNumber('');
    // Room type usually repeats along a corridor, so it is kept for the next room.
    router.push({ pathname: '/room/[id]', params: { id: room.id } });
  };

  const confirmRemove = (room: Room) => {
    const count = countFor(room.id);
    Alert.alert(
      `Delete room ${room.number}?`,
      count > 0 ? `This also deletes its ${count} defect${count === 1 ? '' : 's'}.` : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeRoom(room.id) },
      ],
    );
  };

  const sorted = [...rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.eyebrow}>Voice sweep prototype</Text>
        <Text style={styles.title}>Rooms</Text>
      </View>

      <View style={styles.addCard}>
        <View style={styles.addRow}>
          <View style={styles.fieldNumber}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              value={number}
              onChangeText={setNumber}
              placeholder="1008"
              placeholderTextColor={C.lineStrong}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              style={styles.input}
              accessibilityLabel="Room number"
            />
          </View>
          <View style={styles.fieldType}>
            <Text style={styles.label}>Type (optional)</Text>
            <TextInput
              value={type}
              onChangeText={setType}
              placeholder="RT1A King"
              placeholderTextColor={C.lineStrong}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onAdd}
              style={styles.input}
              accessibilityLabel="Room type"
            />
          </View>
        </View>
        {duplicate ? <Text style={styles.hint}>Room {trimmed} is already in the list.</Text> : null}
        <Pressable
          onPress={onAdd}
          disabled={!canAdd}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, !canAdd && styles.disabled, pressed && styles.pressed]}>
          <Feather name="mic" size={18} color={C.onInk} />
          <Text style={styles.addButtonText}>Add room and start sweep</Text>
        </Pressable>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No rooms yet. Add the room you are standing in, then talk through its defects.
          </Text>
        }
        renderItem={({ item }) => {
          const count = countFor(item.id);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/room/[id]', params: { id: item.id } })}
              onLongPress={() => confirmRemove(item)}
              accessibilityRole="button"
              accessibilityHint="Opens the room. Long press to delete."
              style={({ pressed }) => [styles.room, pressed && styles.pressed]}>
              <Text style={styles.roomNumber}>{item.number}</Text>
              {item.type ? (
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{item.type}</Text>
                </View>
              ) : null}
              <Text style={styles.roomCount}>
                {count} defect{count === 1 ? '' : 's'}
              </Text>
              <Feather name="chevron-right" size={20} color={C.muted} />
            </Pressable>
          );
        }}
      />

      <View style={[styles.statusBar, { paddingBottom: insets.bottom + 10 }]}>
        {update.ready ? (
          <Pressable
            onPress={update.restart}
            accessibilityRole="button"
            style={({ pressed }) => [styles.restart, pressed && styles.pressed]}>
            <Feather name="download" size={16} color={C.onInk} />
            <Text style={styles.restartText}>New version ready · Restart</Text>
          </Pressable>
        ) : (
          <Text style={styles.version}>
            ProjectDef {version} · {update.working ? 'checking for update…' : update.label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ground },
  header: { backgroundColor: C.ink, paddingHorizontal: 20, paddingBottom: 18 },
  eyebrow: { color: C.onInkMuted, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: C.onInk, fontSize: 30, fontWeight: '700', marginTop: 2 },

  addCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  addRow: { flexDirection: 'row', gap: 12 },
  fieldNumber: { flex: 2, gap: 6 },
  fieldType: { flex: 3, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted },
  input: {
    height: TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.lineStrong,
    paddingHorizontal: 12,
    fontSize: 18,
    color: C.ink,
    backgroundColor: C.card,
  },
  hint: { fontSize: 13, color: C.warnText },
  addButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: { color: C.onInk, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },

  list: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  empty: { fontSize: 15, lineHeight: 22, color: C.muted, paddingHorizontal: 4, paddingTop: 12 },
  room: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  roomNumber: { fontSize: 20, fontWeight: '700', color: C.ink },
  typeChip: { backgroundColor: C.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: C.ink },
  roomCount: { marginLeft: 'auto', fontSize: 14, color: C.muted },

  statusBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  version: { fontSize: 12, color: C.muted, textAlign: 'center' },
  restart: {
    height: TOUCH,
    borderRadius: 12,
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  restartText: { color: C.onInk, fontSize: 15, fontWeight: '600' },
});
