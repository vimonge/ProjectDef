import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TRADE_NAMES, ZONE_NAMES } from '@/lib/library';
import { formatTitle } from '@/lib/parser';
import type { Defect, DefectEdit } from '@/lib/store';
import { C, TOUCH } from '@/lib/theme';

type Props = {
  defect: Defect;
  roomNumber: string;
  onSave: (edit: DefectEdit) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** Fix a draft the voice sweep got wrong. Opens as a sheet over the room. */
export function DefectEditor({ defect, roomNumber, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [issue, setIssue] = useState(defect.issue);
  const [detail, setDetail] = useState(defect.detail);
  const [zone, setZone] = useState(defect.zone);
  const [trade, setTrade] = useState(defect.trade);

  const canSave = issue.trim().length > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close without saving" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.preview}>{formatTitle(roomNumber, issue.trim(), detail.trim())}</Text>
            <Text style={styles.heard}>Heard: “{defect.raw}”</Text>

            <Text style={styles.label}>Issue</Text>
            <TextInput value={issue} onChangeText={setIssue} style={styles.input} accessibilityLabel="Issue" />

            <Text style={styles.label}>Where (optional)</Text>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder="behind entry door"
              placeholderTextColor={C.lineStrong}
              autoCapitalize="none"
              style={styles.input}
              accessibilityLabel="Where on the item"
            />

            <Text style={styles.label}>Zone</Text>
            <Chips options={ZONE_NAMES} value={zone} onChange={setZone} />

            <Text style={styles.label}>Trade</Text>
            <Chips options={TRADE_NAMES} value={trade} onChange={setTrade} />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave({ issue: issue.trim(), detail: detail.trim(), zone, trade })}
              disabled={!canSave}
              accessibilityRole="button"
              style={({ pressed }) => [styles.save, !canSave && styles.disabled, pressed && styles.pressed]}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,23,28,0.55)' },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: '88%',
    backgroundColor: C.ground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  body: { padding: 20, gap: 8 },
  preview: { fontSize: 20, fontWeight: '700', color: C.ink },
  heard: { fontSize: 13, color: C.muted, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginTop: 8 },
  input: {
    minHeight: TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.lineStrong,
    paddingHorizontal: 12,
    fontSize: 17,
    color: C.ink,
    backgroundColor: C.card,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.card,
  },
  chipSelected: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 15, color: C.ink },
  chipTextSelected: { color: C.onInk, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  delete: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.recText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: C.recText, fontSize: 16, fontWeight: '600' },
  save: { flex: 1, height: 52, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: C.onInk, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
