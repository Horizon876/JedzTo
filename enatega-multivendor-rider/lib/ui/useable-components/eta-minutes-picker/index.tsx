import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const ACCENT = '#00A8FF'
const MUTED = '#8E8E93'
const PAGE = '#121212'
const SURFACE = '#1C1C1E'
const HAIRLINE = '#2C2C2E'
const PRESETS = [15, 20, 30, 45, 60]

type Props = {
  title: string
  hint?: string
  value: number
  onChange: (minutes: number) => void
}

export function EtaMinutesPicker({ title, hint, value, onChange }: Props) {
  const [minutes, setMinutes] = useState(value)

  useEffect(() => {
    setMinutes(value)
  }, [value])

  const set = (next: number) => {
    const clamped = Math.max(5, Math.min(240, next))
    setMinutes(clamped)
    onChange(clamped)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={styles.valueRow}>
        <TouchableOpacity
          style={styles.step}
          onPress={() => set(minutes - 5)}
          activeOpacity={0.85}
        >
          <Text style={styles.stepText}>−5</Text>
        </TouchableOpacity>
        <Text style={styles.value}>
          {minutes} min
        </Text>
        <TouchableOpacity
          style={styles.step}
          onPress={() => set(minutes + 5)}
          activeOpacity={0.85}
        >
          <Text style={styles.stepText}>+5</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, minutes === p && styles.chipActive]}
            onPress={() => set(p)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, minutes === p && styles.chipTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    gap: 10,
  },
  label: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  hint: { color: MUTED, fontSize: 13, marginTop: -4 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    width: 64,
    height: 40,
    borderRadius: 10,
    backgroundColor: PAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  value: { color: '#fff', fontSize: 28, fontWeight: '800' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: PAGE,
  },
  chipActive: { backgroundColor: ACCENT },
  chipText: { color: MUTED, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
})
