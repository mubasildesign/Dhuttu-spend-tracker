import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import {
  BRANDS,
  CATEGORIES,
  INVESTMENT_BUCKETS,
  PAYMENT_METHODS,
  TRIP_CATEGORIES,
  brandForName,
  categoryLabel,
  faviconUrl,
  formatInr,
  investmentBucketLabel,
  monthKey,
  monthlyForGoal,
  tripCategoryLabel,
  type InvestmentPlan,
  type PaymentMethod,
  type SpendCategory,
  type Transaction,
  type Trip,
  type TripCategory,
  type TripExpense,
  type TripPlanLine,
} from "@spend-tracker/shared";
import {
  deleteInvestmentPlan,
  deleteTransaction,
  deleteTrip,
  deleteTripExpense,
  getBudget,
  listInvestmentPlans,
  listMerchants,
  listTransactions,
  listTripExpenses,
  listTrips,
  newId,
  saveInvestmentPlan,
  saveTransaction,
  saveTrip,
  saveTripExpense,
  upsertBudget,
} from "./src/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Tab = "home" | "ledger" | "trips" | "invest" | "more";

function Logo({ name, size = 36 }: { name: string; size?: number }) {
  const brand = brandForName(name);
  const [failed, setFailed] = useState(false);
  if (!brand || failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          backgroundColor: brand?.color ?? "#614051",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.34 }}>
          {brand?.letter ?? name.slice(0, 1)}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: faviconUrl(brand.domain, 128) }}
        style={{ width: size * 0.62, height: size * 0.62 }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

function defaultTripPlan(total: number): TripPlanLine[] {
  const weights: Record<string, number> = {
    stay: 0.35,
    travel: 0.25,
    food: 0.2,
    local_transport: 0.08,
    activities: 0.07,
    shopping: 0.03,
    misc: 0.02,
  };
  return TRIP_CATEGORIES.map((c) => ({
    category: c.id,
    label: c.label,
    planned: Math.round(total * (weights[c.id] ?? 0.05)),
  }));
}

export default function App() {
  const scheme = useColorScheme();
  const [dark, setDark] = useState(scheme === "dark");
  const c = dark ? darkColors : lightColors;

  const [tab, setTab] = useState<Tab>("home");
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripSpent, setTripSpent] = useState<Record<string, number>>({});
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [voiceFirst, setVoiceFirst] = useState(false);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<SpendCategory>("food_delivery");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthLimitInput, setMonthLimitInput] = useState("25000");

  const [tripModal, setTripModal] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripDest, setTripDest] = useState("");
  const [tripBudget, setTripBudget] = useState("30000");
  const [tripExpModal, setTripExpModal] = useState(false);
  const [tripExpAmount, setTripExpAmount] = useState("");
  const [tripExpTitle, setTripExpTitle] = useState("");
  const [tripExpCat, setTripExpCat] = useState<TripCategory>("food");

  const [investIncome, setInvestIncome] = useState("80000");
  const [investTarget, setInvestTarget] = useState("15000");
  const [goalName, setGoalName] = useState("House down payment");
  const [goalAmount, setGoalAmount] = useState("500000");
  const [goalMonths, setGoalMonths] = useState("24");

  const refresh = useCallback(async () => {
    const [t, m, mb, tripList, planList] = await Promise.all([
      listTransactions(),
      listMerchants(),
      getBudget("monthly"),
      listTrips(),
      listInvestmentPlans(),
    ]);
    setTxs(t);
    setMerchants(m.map((x) => x.name));
    setMonthlyLimit(mb?.totalLimit ?? null);
    if (mb) setMonthLimitInput(String(mb.totalLimit));
    setTrips(tripList);
    setPlans(planList);
    const spent: Record<string, number> = {};
    await Promise.all(
      tripList.map(async (tr) => {
        const exps = await listTripExpenses(tr.id);
        spent[tr.id] = exps.reduce((s, e) => s + e.amount, 0);
      }),
    );
    setTripSpent(spent);
    if (activeTripId) {
      setTripExpenses(await listTripExpenses(activeTripId));
    }
  }, [activeTripId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useSpeechRecognitionEvent("result", (event) => {
    const value = event.results[0]?.transcript ?? "";
    if (event.isFinal && value.trim()) {
      setListening(false);
      void parseTranscript(value.trim());
    }
  });
  useSpeechRecognitionEvent("error", () => setListening(false));
  useSpeechRecognitionEvent("end", () => setListening(false));

  const monthSpend = useMemo(
    () =>
      txs.filter((t) => t.occurredAt.slice(0, 7) === monthKey()).reduce((s, t) => s + t.amount, 0),
    [txs],
  );
  const today = new Date().toISOString().slice(0, 10);
  const todaySpend = useMemo(
    () => txs.filter((t) => t.occurredAt.slice(0, 10) === today).reduce((s, t) => s + t.amount, 0),
    [txs, today],
  );
  const left = monthlyLimit == null ? null : monthlyLimit - monthSpend;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs.filter((x) => x.occurredAt.slice(0, 7) === monthKey())) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [txs]);

  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null;
  const neededMonthly = monthlyForGoal(Number(goalAmount) || 0, Number(goalMonths) || 1);
  const investPct =
    Number(investIncome) > 0
      ? Math.round(((Number(investTarget) || 0) / Number(investIncome)) * 100)
      : 0;

  async function parseTranscript(value: string) {
    try {
      const res = await fetch(`${API_URL}/api/ai/parse-spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: value, merchants }),
      });
      const data = await res.json();
      const d = data.draft;
      if (d?.amount) setAmount(String(d.amount));
      if (d?.merchant) setMerchant(d.merchant);
      if (d?.category) setCategory(d.category);
      if (d?.method) setMethod(d.method);
      if (d?.note) setNote(d.note);
    } catch {
      const m = value.match(/([0-9]+)/);
      if (m) setAmount(m[1]!);
      if (value.toLowerCase().includes("swiggy")) setMerchant("Swiggy");
    }
  }

  async function startVoice() {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setError("Mic permission needed");
      return;
    }
    setListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-IN", interimResults: true, continuous: false });
  }

  function openAdd(voice = false) {
    setError(null);
    setVoiceFirst(voice);
    setModalOpen(true);
    if (voice) setTimeout(() => void startVoice(), 250);
  }

  async function save() {
    const value = Number(amount);
    if (!value || !merchant.trim()) {
      setError("Enter amount and app/shop");
      return;
    }
    const now = new Date().toISOString();
    await saveTransaction({
      id: newId("tx"),
      amount: value,
      currency: "INR",
      method,
      merchant: merchant.trim(),
      category,
      note: note.trim(),
      source: voiceFirst ? "voice" : "manual",
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    setAmount("");
    setMerchant("");
    setNote("");
    setModalOpen(false);
    await refresh();
  }

  async function createTrip() {
    if (!tripName.trim() || !tripDest.trim()) {
      setError("Add trip name and place");
      return;
    }
    const now = new Date().toISOString();
    const budget = Number(tripBudget) || 0;
    const day = now.slice(0, 10);
    await saveTrip({
      id: newId("trip"),
      name: tripName.trim(),
      destination: tripDest.trim(),
      startDate: day,
      endDate: day,
      totalBudget: budget,
      plan: defaultTripPlan(budget),
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    setTripModal(false);
    setTripName("");
    setTripDest("");
    setError(null);
    await refresh();
  }

  async function addTripExpense() {
    if (!activeTripId) return;
    const value = Number(tripExpAmount);
    if (!value || !tripExpTitle.trim()) {
      setError("Enter amount and what for");
      return;
    }
    const now = new Date().toISOString();
    await saveTripExpense({
      id: newId("texp"),
      tripId: activeTripId,
      amount: value,
      category: tripExpCat,
      title: tripExpTitle.trim(),
      note: "",
      paidWith: "upi",
      occurredAt: now,
      createdAt: now,
    });
    setTripExpModal(false);
    setTripExpAmount("");
    setTripExpTitle("");
    setError(null);
    await refresh();
  }

  async function saveInvestPlan() {
    const now = new Date().toISOString();
    const target = Number(investTarget) || 0;
    await saveInvestmentPlan({
      id: newId("invest"),
      name: "My invest plan",
      monthlyIncome: Number(investIncome) || 0,
      monthlyInvestTarget: target,
      buckets: INVESTMENT_BUCKETS.map((b) => ({
        bucket: b.id,
        amount: b.id === "sip" ? Math.round(target * 0.5) : b.id === "emergency" ? Math.round(target * 0.3) : 0,
        note: "",
      })),
      goalName: goalName.trim(),
      goalAmount: Number(goalAmount) || 0,
      goalMonths: Number(goalMonths) || 1,
      createdAt: now,
      updatedAt: now,
    });
    await refresh();
  }

  const tabTitle =
    tab === "home"
      ? "Home"
      : tab === "ledger"
        ? "All spends"
        : tab === "trips"
          ? activeTrip
            ? activeTrip.name
            : "Trips"
          : tab === "invest"
            ? "Invest"
            : "More";

  const showDailyAdd = tab === "home" || tab === "ledger";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <StatusBar style={dark ? "light" : "dark"} />

      <View style={[styles.top, { borderBottomColor: c.line, backgroundColor: c.surface }]}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={require("./assets/icon.png")}
            style={{ width: 36, height: 36, borderRadius: 9 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: c.muted }]}>Dhuttu</Text>
            <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
              {tabTitle}
            </Text>
          </View>
        </View>
        {showDailyAdd ? (
          <View style={styles.topActions}>
            <Pressable
              style={[styles.iconBtn, { borderColor: c.line, backgroundColor: c.bg }]}
              onPress={() => openAdd(true)}
            >
              <Text style={{ color: c.ink, fontWeight: "700" }}>Mic</Text>
            </Pressable>
            <Pressable style={[styles.cta, { backgroundColor: c.accent }]} onPress={() => openAdd(false)}>
              <Text style={[styles.ctaText, { color: "#fff" }]}>+ Add</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === "home" && (
          <>
            <View style={[styles.hint, { backgroundColor: c.accentSoft }]}>
              <Text style={{ color: c.accentInk, fontWeight: "600", fontSize: 13 }}>
                Add daily spends here. Use Trips and Invest tabs for holiday money and SIPs — kept
                separate.
              </Text>
            </View>

            <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.kicker, { color: c.muted }]}>This month</Text>
              <Text style={[styles.heroAmt, { color: c.ink }]}>{formatInr(monthSpend)}</Text>
              <Text style={{ color: c.muted, marginTop: 4 }}>
                Today {formatInr(todaySpend)}
                {left != null ? ` · Left ${formatInr(Math.max(left, 0))}` : ""}
              </Text>
              <View style={styles.quickRow}>
                <Pressable
                  style={[styles.quick, { backgroundColor: c.accentSoft }]}
                  onPress={() => openAdd(true)}
                >
                  <Text style={{ color: c.accentInk, fontWeight: "700" }}>Speak spend</Text>
                </Pressable>
                <Pressable
                  style={[styles.quick, { backgroundColor: c.accent }]}
                  onPress={() => openAdd(false)}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Type spend</Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.section, { color: c.ink }]}>Quick apps</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {BRANDS.slice(0, 10).map((b) => (
                <Pressable
                  key={b.id}
                  style={styles.appChip}
                  onPress={() => {
                    setMerchant(b.name);
                    openAdd(false);
                  }}
                >
                  <Logo name={b.name} size={40} />
                  <Text style={[styles.appName, { color: c.muted }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink, marginBottom: 8 }]}>Top categories</Text>
              {byCategory.length === 0 ? (
                <Text style={{ color: c.muted }}>Add a few spends to see the picture.</Text>
              ) : (
                byCategory.map((row) => {
                  const pct = Math.min(100, (row.total / Math.max(monthSpend, 1)) * 100);
                  return (
                    <View key={row.cat} style={{ marginBottom: 12 }}>
                      <View style={styles.rowBetween}>
                        <Text style={{ color: c.ink, fontWeight: "600" }}>
                          {categoryLabel(row.cat as SpendCategory)}
                        </Text>
                        <Text style={{ color: c.ink, fontVariant: ["tabular-nums"] }}>
                          {formatInr(row.total)}
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: c.bg }]}>
                        <View
                          style={{
                            width: `${pct}%`,
                            height: 8,
                            borderRadius: 99,
                            backgroundColor: c.accent,
                          }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Recent</Text>
              {txs.slice(0, 5).map((t) => (
                <View key={t.id} style={styles.txRow}>
                  <Logo name={t.merchant} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontWeight: "600" }}>{t.merchant}</Text>
                    <Text style={{ color: c.muted, fontSize: 12 }}>{categoryLabel(t.category)}</Text>
                  </View>
                  <Text style={{ color: c.ink, fontVariant: ["tabular-nums"], fontWeight: "600" }}>
                    {formatInr(t.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {tab === "ledger" && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Text style={{ color: c.muted, marginBottom: 8, fontSize: 13 }}>
              Everyday spends only — trip money is under Trips.
            </Text>
            {txs.map((t) => (
              <View key={t.id} style={styles.txRow}>
                <Logo name={t.merchant} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.ink, fontWeight: "600" }}>{t.merchant}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{categoryLabel(t.category)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: c.ink, fontWeight: "700" }}>{formatInr(t.amount)}</Text>
                  <Pressable onPress={() => void deleteTransaction(t.id).then(refresh)}>
                    <Text style={{ color: c.danger, fontSize: 12, marginTop: 4 }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "trips" && !activeTrip && (
          <>
            <View style={[styles.hint, { backgroundColor: c.blushSoft }]}>
              <Text style={{ color: c.ink, fontWeight: "600", fontSize: 13 }}>
                Plan a trip budget, then open it to log hotel/cab/food separately from daily spends.
              </Text>
            </View>
            <Pressable
              style={[styles.cta, { backgroundColor: c.accent, marginBottom: 12 }]}
              onPress={() => {
                setError(null);
                setTripModal(true);
              }}
            >
              <Text style={[styles.ctaText, { color: "#fff", textAlign: "center" }]}>
                + New trip
              </Text>
            </Pressable>
            {trips.length === 0 ? (
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
                <Text style={{ color: c.muted }}>No trips yet. Plan Goa, Manali, or a weekend.</Text>
              </View>
            ) : (
              trips.map((tr) => {
                const spent = tripSpent[tr.id] ?? 0;
                const remain = tr.totalBudget - spent;
                return (
                  <Pressable
                    key={tr.id}
                    style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}
                    onPress={() => {
                      setActiveTripId(tr.id);
                      void listTripExpenses(tr.id).then(setTripExpenses);
                    }}
                  >
                    <Text style={{ color: c.ink, fontWeight: "800", fontSize: 16 }}>{tr.name}</Text>
                    <Text style={{ color: c.muted, marginTop: 2 }}>{tr.destination}</Text>
                    <Text style={{ color: c.ink, marginTop: 8, fontWeight: "600" }}>
                      {formatInr(spent)} / {formatInr(tr.totalBudget)}
                    </Text>
                    <Text style={{ color: remain >= 0 ? c.muted : c.danger, fontSize: 12, marginTop: 2 }}>
                      {remain >= 0 ? `${formatInr(remain)} left` : `Over by ${formatInr(Math.abs(remain))}`}
                    </Text>
                    <Pressable
                      onPress={() => void deleteTrip(tr.id).then(refresh)}
                      style={{ marginTop: 8 }}
                    >
                      <Text style={{ color: c.danger, fontSize: 12 }}>Delete trip</Text>
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {tab === "trips" && activeTrip && (
          <>
            <Pressable onPress={() => setActiveTripId(null)} style={{ marginBottom: 8 }}>
              <Text style={{ color: c.accentInk, fontWeight: "700" }}>← All trips</Text>
            </Pressable>
            <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={{ color: c.muted }}>{activeTrip.destination}</Text>
              <Text style={[styles.heroAmt, { color: c.ink, fontSize: 28 }]}>
                {formatInr(tripSpent[activeTrip.id] ?? 0)}
              </Text>
              <Text style={{ color: c.muted }}>
                of {formatInr(activeTrip.totalBudget)} trip budget
              </Text>
              <Pressable
                style={[styles.cta, { backgroundColor: c.accent, marginTop: 12 }]}
                onPress={() => {
                  setError(null);
                  setTripExpModal(true);
                }}
              >
                <Text style={[styles.ctaText, { color: "#fff", textAlign: "center" }]}>
                  + Add trip spend
                </Text>
              </Pressable>
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Trip spends</Text>
              {tripExpenses.length === 0 ? (
                <Text style={{ color: c.muted }}>No trip spends yet.</Text>
              ) : (
                tripExpenses.map((e) => (
                  <View key={e.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.ink, fontWeight: "600" }}>{e.title}</Text>
                      <Text style={{ color: c.muted, fontSize: 12 }}>
                        {tripCategoryLabel(e.category)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: c.ink, fontWeight: "700" }}>{formatInr(e.amount)}</Text>
                      <Pressable onPress={() => void deleteTripExpense(e.id).then(refresh)}>
                        <Text style={{ color: c.danger, fontSize: 12, marginTop: 4 }}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {tab === "invest" && (
          <>
            <View style={[styles.hint, { backgroundColor: c.skySoft }]}>
              <Text style={{ color: c.ink, fontWeight: "600", fontSize: 13 }}>
                Decide how much to invest each month. Separate from daily spends and trips.
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Monthly plan</Text>
              <Text style={{ color: c.muted, marginBottom: 4 }}>Income (₹)</Text>
              <TextInput
                value={investIncome}
                onChangeText={setInvestIncome}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Invest each month (₹)</Text>
              <TextInput
                value={investTarget}
                onChangeText={setInvestTarget}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Text style={{ color: c.muted, marginTop: 8, fontSize: 13 }}>
                About {investPct}% of income
              </Text>
              <Text style={{ color: c.muted, marginBottom: 4, marginTop: 12 }}>Goal name</Text>
              <TextInput
                value={goalName}
                onChangeText={setGoalName}
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Goal amount (₹)</Text>
              <TextInput
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Months</Text>
              <TextInput
                value={goalMonths}
                onChangeText={setGoalMonths}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Text style={{ color: c.accentInk, marginTop: 12, fontWeight: "600" }}>
                Need ~{formatInr(neededMonthly)}/mo for this goal. Your target is{" "}
                {formatInr(Number(investTarget) || 0)}.
              </Text>
              <Pressable
                style={[styles.cta, { backgroundColor: c.accent, marginTop: 14 }]}
                onPress={() => void saveInvestPlan()}
              >
                <Text style={[styles.ctaText, { color: "#fff", textAlign: "center" }]}>
                  Save invest plan
                </Text>
              </Pressable>
            </View>
            {plans.length > 0 ? (
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
                <Text style={[styles.section, { color: c.ink }]}>Saved plans</Text>
                {plans.map((p) => (
                  <View key={p.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.ink, fontWeight: "600" }}>{p.name}</Text>
                      <Text style={{ color: c.muted, fontSize: 12 }}>
                        {formatInr(p.monthlyInvestTarget)}/mo · {p.goalName}
                      </Text>
                      <Text style={{ color: c.muted, fontSize: 11, marginTop: 2 }}>
                        {p.buckets
                          .filter((b) => b.amount > 0)
                          .map((b) => `${investmentBucketLabel(b.bucket)} ${formatInr(b.amount)}`)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Pressable onPress={() => void deleteInvestmentPlan(p.id).then(refresh)}>
                      <Text style={{ color: c.danger, fontSize: 12 }}>Delete</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        {tab === "more" && (
          <>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Monthly budget</Text>
              <Text style={{ color: c.muted, marginBottom: 8 }}>
                Spent {formatInr(monthSpend)}
                {monthlyLimit != null ? ` of ${formatInr(monthlyLimit)}` : ""}
              </Text>
              <TextInput
                value={monthLimitInput}
                onChangeText={setMonthLimitInput}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              />
              <Pressable
                style={[styles.cta, { backgroundColor: c.accent, marginTop: 12 }]}
                onPress={() =>
                  void upsertBudget({
                    id: newId("budget"),
                    period: "monthly",
                    periodKey: monthKey(),
                    totalLimit: Number(monthLimitInput),
                    categoryLimits: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }).then(refresh)
                }
              >
                <Text style={[styles.ctaText, { color: "#fff", textAlign: "center" }]}>
                  Save budget
                </Text>
              </Pressable>
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Appearance</Text>
              <Text style={{ color: c.muted, marginBottom: 10, fontSize: 13 }}>
                Brand plum #614051 — light or dark.
              </Text>
              <Pressable
                style={[styles.cta, { backgroundColor: c.ink }]}
                onPress={() => setDark((d) => !d)}
              >
                <Text style={[styles.ctaText, { color: c.bg, textAlign: "center" }]}>
                  Switch to {dark ? "light" : "dark"}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Text style={[styles.section, { color: c.ink }]}>Apps</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {BRANDS.map((b) => (
                  <View key={b.id} style={{ width: 64, alignItems: "center" }}>
                    <Logo name={b.name} />
                    <Text style={{ color: c.muted, fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                      {b.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: c.surface, borderTopColor: c.line }]}>
        {(
          [
            ["home", "Home"],
            ["ledger", "Spends"],
            ["trips", "Trips"],
            ["invest", "Invest"],
            ["more", "More"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            style={styles.tabItem}
            onPress={() => {
              if (id !== "trips") setActiveTripId(null);
              setTab(id);
            }}
          >
            <Text style={{ color: tab === id ? c.accent : c.muted, fontWeight: "700", fontSize: 11 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.surface }]}>
            <Text style={[styles.section, { color: c.ink }]}>Add spend</Text>
            <Pressable
              style={[styles.cta, { backgroundColor: listening ? c.accent : c.bg, marginBottom: 10 }]}
              onPress={() => (listening ? ExpoSpeechRecognitionModule.stop() : void startVoice())}
            >
              <Text style={{ color: listening ? "#fff" : c.ink, fontWeight: "700", textAlign: "center" }}>
                {listening ? "Listening…" : "Tap to speak"}
              </Text>
            </Pressable>
            <Text style={{ color: c.muted, marginBottom: 4 }}>Amount</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg, fontSize: 22 }]}
              placeholder="380"
              placeholderTextColor={c.muted}
            />
            <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Where</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              placeholder="Swiggy"
              placeholderTextColor={c.muted}
            />
            <ScrollView horizontal style={{ marginVertical: 10 }}>
              {merchants.slice(0, 8).map((name) => (
                <Pressable key={name} style={{ marginRight: 10, alignItems: "center" }} onPress={() => setMerchant(name)}>
                  <Logo name={name} size={32} />
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal>
              {PAYMENT_METHODS.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMethod(m.id)}
                  style={[
                    styles.pill,
                    {
                      borderColor: c.line,
                      backgroundColor: method === m.id ? c.accentSoft : c.bg,
                    },
                  ]}
                >
                  <Text style={{ color: c.ink, fontSize: 12 }}>{m.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal style={{ marginTop: 8 }}>
              {CATEGORIES.slice(0, 8).map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.pill,
                    {
                      borderColor: c.line,
                      backgroundColor: category === cat.id ? c.accentSoft : c.bg,
                    },
                  ]}
                >
                  <Text style={{ color: c.ink, fontSize: 12 }}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {error ? <Text style={{ color: c.danger, marginTop: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.bg }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={{ color: c.ink, fontWeight: "700", textAlign: "center" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.accent }]}
                onPress={() => void save()}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={tripModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.surface }]}>
            <Text style={[styles.section, { color: c.ink }]}>New trip</Text>
            <Text style={{ color: c.muted, marginBottom: 4 }}>Trip name</Text>
            <TextInput
              value={tripName}
              onChangeText={setTripName}
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              placeholder="Goa with friends"
              placeholderTextColor={c.muted}
            />
            <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Destination</Text>
            <TextInput
              value={tripDest}
              onChangeText={setTripDest}
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              placeholder="Goa"
              placeholderTextColor={c.muted}
            />
            <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>Total budget (₹)</Text>
            <TextInput
              value={tripBudget}
              onChangeText={setTripBudget}
              keyboardType="number-pad"
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
            />
            {error ? <Text style={{ color: c.danger, marginTop: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.bg }]}
                onPress={() => setTripModal(false)}
              >
                <Text style={{ color: c.ink, fontWeight: "700", textAlign: "center" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.accent }]}
                onPress={() => void createTrip()}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={tripExpModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.surface }]}>
            <Text style={[styles.section, { color: c.ink }]}>Add trip spend</Text>
            <Text style={{ color: c.muted, marginBottom: 4 }}>Amount (₹)</Text>
            <TextInput
              value={tripExpAmount}
              onChangeText={setTripExpAmount}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg, fontSize: 22 }]}
              placeholder="1200"
              placeholderTextColor={c.muted}
            />
            <Text style={{ color: c.muted, marginBottom: 4, marginTop: 10 }}>What for?</Text>
            <TextInput
              value={tripExpTitle}
              onChangeText={setTripExpTitle}
              style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.bg }]}
              placeholder="Hotel night 1"
              placeholderTextColor={c.muted}
            />
            <ScrollView horizontal style={{ marginTop: 10 }}>
              {TRIP_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setTripExpCat(cat.id)}
                  style={[
                    styles.pill,
                    {
                      borderColor: c.line,
                      backgroundColor: tripExpCat === cat.id ? c.accentSoft : c.bg,
                    },
                  ]}
                >
                  <Text style={{ color: c.ink, fontSize: 12 }}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {error ? <Text style={{ color: c.danger, marginTop: 8 }}>{error}</Text> : null}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.bg }]}
                onPress={() => setTripExpModal(false)}
              >
                <Text style={{ color: c.ink, fontWeight: "700", textAlign: "center" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.cta, { flex: 1, backgroundColor: c.accent }]}
                onPress={() => void addTripExpense()}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const lightColors = {
  bg: "#ECEEF2",
  surface: "#FFFFFF",
  ink: "#12151A",
  muted: "#5F6773",
  line: "#D5DAE2",
  accent: "#614051",
  accentSoft: "#F0E8EC",
  accentInk: "#4A303E",
  blushSoft: "#FDE8E4",
  skySoft: "#E8F0FC",
  danger: "#C62828",
};

const darkColors = {
  bg: "#090909",
  surface: "#141414",
  ink: "#F0F2F5",
  muted: "#9AA3B0",
  line: "rgba(255,255,255,0.07)",
  accent: "#D9B4C2",
  accentSoft: "rgba(217,180,194,0.18)",
  accentInk: "#F3E4EA",
  blushSoft: "rgba(240,113,103,0.12)",
  skySoft: "rgba(122,168,239,0.12)",
  danger: "#F07167",
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  kicker: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, marginTop: 2 },
  topActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  cta: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: { fontWeight: "800" },
  content: { padding: 16, paddingBottom: 110, gap: 12 },
  hint: { borderRadius: 14, padding: 12 },
  hero: { borderWidth: 1, borderRadius: 18, padding: 16 },
  heroAmt: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  quick: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  appChip: { width: 68, alignItems: "center", marginRight: 8 },
  appName: { fontSize: 10, marginTop: 6 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", minHeight: 44, justifyContent: "center" },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(44,41,64,0.45)",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
});
