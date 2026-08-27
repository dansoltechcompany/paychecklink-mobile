import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { calculatePaycheck } from "../lib/calculator";
import type { FilingStatus, PayFrequency, PayType, StateCode } from "../lib/types";
import { ALL_STATES, FREQUENCY_LABELS, STATE_NAMES } from "../lib/types";

const BRAND = "#0466c8";
const PAPER = "#eaf3fb";
const INK = "#12263a";
const MUTED = "#4d6478";
const WHITE = "#ffffff";
const BORDER = "#c9dcea";

const FREQUENCIES: PayFrequency[] = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "annual",
];

const FILING: { value: FilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married jointly" },
  { value: "head", label: "Head of household" },
];

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function App() {
  const [payType, setPayType] = useState<PayType>("salary");
  const [grossText, setGrossText] = useState("2307.69");
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [state, setState] = useState<StateCode>("TX");
  const [k401Text, setK401Text] = useState("0");
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const result = useMemo(() => {
    const gross = Number(grossText);
    const k401 = Number(k401Text);
    if (!Number.isFinite(gross) || gross <= 0) return null;
    return calculatePaycheck({
      country: "US",
      payType,
      grossAmount: gross,
      payFrequency: frequency,
      filingStatus,
      state,
      preTax401kPercent: Number.isFinite(k401) ? k401 : 0,
      hoursPerWeek: 40,
    });
  }, [grossText, payType, frequency, filingStatus, state, k401Text]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>PaycheckLink</Text>
        <Text style={styles.headerSub}>Paycheck & take-home calculator</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Estimate net pay after federal tax, FICA, and state tax for all 50 US
          states (2026 rates). Same engine as paychecklink.com.
        </Text>

        <View style={styles.segmentRow}>
          {(["salary", "hourly"] as PayType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setPayType(t)}
              style={[styles.segment, payType === t && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  payType === t && styles.segmentTextActive,
                ]}
              >
                {t === "salary" ? "Salary" : "Hourly"}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel>
          {payType === "salary"
            ? `Gross per ${FREQUENCY_LABELS[frequency].toLowerCase()} ($)`
            : "Hourly rate ($)"}
        </FieldLabel>
        <TextInput
          style={styles.input}
          value={grossText}
          onChangeText={(t) => setGrossText(t.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="2307.69"
          placeholderTextColor={MUTED}
        />

        <FieldLabel>Pay frequency</FieldLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[styles.chip, frequency === f && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    frequency === f && styles.chipTextActive,
                  ]}
                >
                  {FREQUENCY_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <FieldLabel>Filing status</FieldLabel>
        <View style={styles.chipRowWrap}>
          {FILING.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => setFilingStatus(f.value)}
              style={[
                styles.chip,
                filingStatus === f.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filingStatus === f.value && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldLabel>State</FieldLabel>
        <Pressable
          style={styles.select}
          onPress={() => setStatePickerOpen(true)}
        >
          <Text style={styles.selectText}>
            {STATE_NAMES[state]} ({state})
          </Text>
          <Text style={styles.selectChevron}>▼</Text>
        </Pressable>

        <FieldLabel>Traditional 401(k) % of gross</FieldLabel>
        <TextInput
          style={styles.input}
          value={k401Text}
          onChangeText={(t) => setK401Text(t.replace(/[^0-9.]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={MUTED}
        />

        {result && (
          <>
            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Take-home pay</Text>
              <Text style={styles.netAmount}>{money(result.netPay)}</Text>
              <Text style={styles.netSub}>
                {money(result.netAnnual)} / year · {FREQUENCY_LABELS[frequency]}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tax breakdown</Text>
              {result.breakdown.map((line) => (
                <View key={line.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{line.label}</Text>
                  <Text style={styles.rowValue}>{money(line.amount)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabelBold}>Effective tax rate</Text>
                <Text style={styles.rowValueBold}>
                  {result.effectiveTaxRate.toFixed(1)}%
                </Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Estimates only — not tax advice. Rates synced from
              paychecklink.com (2026).
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        visible={statePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStatePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select state</Text>
            <ScrollView>
              {ALL_STATES.map((code) => (
                <Pressable
                  key={code}
                  style={styles.modalItem}
                  onPress={() => {
                    setState(code);
                    setStatePickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      code === state && styles.modalItemActive,
                    ]}
                  >
                    {STATE_NAMES[code]} ({code})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.modalClose}
              onPress={() => setStatePickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAPER },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  brand: { color: WHITE, fontSize: 22, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  intro: { color: MUTED, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  label: {
    color: INK,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  input: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: INK,
  },
  select: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: { fontSize: 16, color: INK },
  selectChevron: { color: MUTED, fontSize: 12 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: WHITE,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: BRAND, borderColor: BRAND },
  segmentText: { color: INK, fontWeight: "600" },
  segmentTextActive: { color: WHITE },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: WHITE,
  },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { color: INK, fontSize: 13 },
  chipTextActive: { color: WHITE, fontWeight: "600" },
  netCard: {
    marginTop: 12,
    backgroundColor: "#e4f0fb",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  netLabel: { color: MUTED, fontSize: 14, fontWeight: "600" },
  netAmount: {
    color: BRAND,
    fontSize: 36,
    fontWeight: "800",
    marginVertical: 4,
  },
  netSub: { color: MUTED, fontSize: 13 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 8,
  },
  cardTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  rowLabel: { flex: 1, color: MUTED, fontSize: 14 },
  rowValue: { color: INK, fontSize: 14, fontWeight: "500" },
  rowLabelBold: { flex: 1, color: INK, fontSize: 14, fontWeight: "700" },
  rowValueBold: { color: INK, fontSize: 14, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  disclaimer: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: INK,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  modalItemText: { fontSize: 16, color: INK },
  modalItemActive: { color: BRAND, fontWeight: "700" },
  modalClose: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  modalCloseText: { color: BRAND, fontWeight: "700", fontSize: 16 },
});
