import { useCallback, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackHeader } from "../components/AppStackHeader";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { SurfaceCard } from "../components/SurfaceCard";
import { api, getErrorMessage } from "../lib/api";
import { depositCoins } from "../lib/payment";
import { type } from "../lib/typography";
import { normalizeUserPayload } from "../lib/user";
import { webTheme } from "../lib/webTheme";
import { useAuthStore } from "../stores/authStore";
import { notify } from "../stores/toastStore";

interface ProfileResponse {
  coins?: number;
  xp?: number;
  subscription?: {
    plan?: "free" | "pro" | "elite";
  };
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  task?: {
    title?: string;
  };
}

const TX_LABELS: Record<string, string> = {
  deposit: "Coins Deposited",
  withdraw: "Coins Withdrawn",
  reward: "Task Reward",
  apply: "Task Application",
  refund: "Refund",
  purchase: "Purchase",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("100");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const scrollRef = useRef<ScrollView>(null);
  const inputCardY = useRef(0);

  const scrollToInput = useCallback((newMode: "deposit" | "withdraw") => {
    setMode(newMode);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: inputCardY.current - 20, animated: true });
    }, 100);
  }, []);

  const { data: profile, isFetching, refetch } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/users/profile"),
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => api.get("/api/transactions"),
  });

  const syncProfile = async () => {
    const nextProfile = await api.get("/api/users/profile");
    setUser(normalizeUserPayload(nextProfile));
  };

  const user = useAuthStore((s) => s.user);

  const depositMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) throw new Error("Enter a valid amount.");
      return depositCoins(parsedAmount, { displayName: user?.displayName, email: user?.email });
    },
    onSuccess: async () => {
      await Promise.all([
        syncProfile(),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      setAmount("100");
      notify.success("Coins deposited successfully!");
    },
    onError: (error: any) => {
      if (error?.code === 0 || error?.description?.includes("cancel")) return;
      notify.error(error?.description ?? getErrorMessage(error));
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount);
      if (!parsedAmount || parsedAmount <= 0) throw new Error("Enter a valid amount.");
      return api.post("/api/transactions/withdraw", { amount: parsedAmount });
    },
    onSuccess: async () => {
      await Promise.all([
        syncProfile(),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      setAmount("100");
      notify.success("Coins withdrawn successfully!");
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const transactionMutation = mode === "deposit" ? depositMutation : withdrawMutation;

  const totalIn = useMemo(
    () =>
      transactions
        .filter((item) => ["deposit", "reward", "refund"].includes(item.type))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [transactions],
  );
  const totalOut = useMemo(
    () =>
      transactions
        .filter((item) => !["deposit", "reward", "refund"].includes(item.type))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        const credit = ["deposit", "reward", "refund"].includes(item.type);
        if (filter === "credit") return credit;
        if (filter === "debit") return !credit;
        return true;
      }),
    [filter, transactions],
  );

  const planLabel = profile?.subscription?.plan?.toUpperCase() || "FREE";
  const depositLimit = planLabel === "ELITE" ? "Unlimited" : planLabel === "PRO" ? "1,000" : "200";
  const depositBarWidth = planLabel === "ELITE" ? "100%" : planLabel === "PRO" ? "66%" : "20%";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop accent={webTheme.red} secondaryAccent={webTheme.gold} />
      <AppStackHeader title="Wallet" detail="Coins, deposits, withdrawals, and rewards." />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={webTheme.red} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginTop: 6 }}>
          <Text
            style={{
              ...type.bold,
              color: "rgba(255,255,255,0.45)",
              fontSize: 10,
              letterSpacing: 2.2,
              textTransform: "uppercase",
            }}
          >
            Coin Balance
          </Text>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 34, marginTop: 12 }}>
            Your Wallet
          </Text>
          <Text
            style={{
              ...type.regular,
              color: webTheme.muted,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
              marginTop: 8,
              maxWidth: 280,
            }}
          >
            Manage your coins, track earnings, and fund applications from the same balance used on web.
          </Text>
        </View>

        <SurfaceCard accent={webTheme.red} style={{ marginTop: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(214,60,71,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(214,60,71,0.22)",
                }}
              >
                <Feather name="credit-card" size={17} color={webTheme.red} />
              </View>
              <View>
                <Text style={{ ...type.bold, color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
                  Total Balance
                </Text>
                <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                  Active plan: {planLabel}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: planLabel === "ELITE" ? "rgba(234,179,8,0.28)" : planLabel === "PRO" ? "rgba(168,85,247,0.28)" : webTheme.border,
                backgroundColor: planLabel === "ELITE" ? "rgba(234,179,8,0.10)" : planLabel === "PRO" ? "rgba(168,85,247,0.10)" : "rgba(255,255,255,0.03)",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{
                  ...type.bold,
                  color: planLabel === "ELITE" ? webTheme.gold : planLabel === "PRO" ? webTheme.purple : webTheme.muted,
                  fontSize: 11,
                  letterSpacing: 1.2,
                }}
              >
                {planLabel}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 26, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 52 }}>
              {(profile?.coins || 0).toLocaleString()}
            </Text>
            <Text style={{ ...type.bold, color: webTheme.red, fontSize: 18 }}>
              coins
            </Text>
          </View>

          <View style={{ marginTop: 22 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ ...type.medium, color: webTheme.muted, fontSize: 12 }}>
                Deposit limit
              </Text>
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 12 }}>
                {depositLimit} coins/tx
              </Text>
            </View>
            <View
              style={{
                marginTop: 10,
                height: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: depositBarWidth,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: planLabel === "ELITE" ? webTheme.gold : planLabel === "PRO" ? webTheme.purple : webTheme.red,
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: 22, flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => scrollToInput("deposit")}
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: webTheme.red,
                paddingVertical: 15,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Feather name="arrow-down-left" size={18} color={webTheme.text} />
              <Text style={{ ...type.bold, color: webTheme.text, fontSize: 13 }}>
                Deposit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => scrollToInput("withdraw")}
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: webTheme.border,
                backgroundColor: "rgba(255,255,255,0.04)",
                paddingVertical: 15,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Feather name="arrow-up-right" size={18} color={webTheme.text} />
              <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13 }}>
                Withdraw
              </Text>
            </Pressable>
          </View>
        </SurfaceCard>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          {[
            { label: "Total In", value: `+${totalIn.toLocaleString()}`, icon: "trending-up", accent: webTheme.green },
            { label: "Total Out", value: `-${totalOut.toLocaleString()}`, icon: "trending-down", accent: webTheme.red },
            { label: "XP", value: `${profile?.xp || 0}`, icon: "zap", accent: webTheme.blue },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1 }}>
              <SurfaceCard>
                <Feather name={item.icon as "trending-up" | "trending-down" | "zap"} size={18} color={item.accent} />
                <Text style={{ ...type.bold, color: "rgba(255,255,255,0.40)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>
                  {item.label}
                </Text>
                <Text style={{ ...type.black, color: item.accent, fontSize: 21, marginTop: 8 }}>
                  {item.value}
                </Text>
              </SurfaceCard>
            </View>
          ))}
        </View>

        <View onLayout={(e) => { inputCardY.current = e.nativeEvent.layout.y; }}>
        <SurfaceCard style={{ marginTop: 16 }}>
          <Text style={{ ...type.black, color: webTheme.text, fontSize: 24 }}>
            {mode === "deposit" ? "Deposit coins" : "Withdraw coins"}
          </Text>
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14, lineHeight: 22, marginTop: 8 }}>
            Amounts sync directly with the shared backend wallet history.
          </Text>

          <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
            {[
              { key: "deposit", label: "Deposit" },
              { key: "withdraw", label: "Withdraw" },
            ].map((item) => {
              const active = mode === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMode(item.key as typeof mode)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "rgba(214,60,71,0.28)" : webTheme.border,
                    backgroundColor: active ? "rgba(214,60,71,0.12)" : "rgba(255,255,255,0.03)",
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ ...type.bold, color: active ? webTheme.red : webTheme.text, fontSize: 13 }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Amount"
            placeholderTextColor="rgba(255,255,255,0.24)"
            style={{
              ...type.regular,
              marginTop: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: webTheme.border,
              backgroundColor: "rgba(255,255,255,0.04)",
              color: webTheme.text,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          />

          <Pressable
            onPress={() => transactionMutation.mutate()}
            disabled={transactionMutation.isPending}
            style={{
              marginTop: 14,
              borderRadius: 999,
              backgroundColor: webTheme.red,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ ...type.bold, color: webTheme.text, fontSize: 14 }}>
              {transactionMutation.isPending
                ? "Processing..."
                : mode === "deposit"
                  ? "Add coins"
                  : "Withdraw coins"}
            </Text>
          </Pressable>
        </SurfaceCard>
        </View>

        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Text style={{ ...type.black, color: webTheme.text, fontSize: 28 }}>
              Transactions
            </Text>
            <Text style={{ ...type.semibold, color: webTheme.muted, fontSize: 12 }}>
              {filteredTransactions.length} entries
            </Text>
          </View>

          <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
            {[
              { key: "all", label: "All" },
              { key: "credit", label: "Credit" },
              { key: "debit", label: "Debit" },
            ].map((item) => {
              const active = filter === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key as typeof filter)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "rgba(214,60,71,0.28)" : webTheme.border,
                    backgroundColor: active ? "rgba(214,60,71,0.12)" : "rgba(255,255,255,0.03)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ ...type.bold, color: active ? webTheme.red : webTheme.muted, fontSize: 12 }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 14, gap: 12 }}>
            {filteredTransactions.map((item) => {
              const credit = ["deposit", "reward", "refund"].includes(item.type);
              return (
                <SurfaceCard key={item._id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: credit ? "rgba(16,185,129,0.12)" : "rgba(214,60,71,0.12)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={credit ? "arrow-down-left" : "arrow-up-right"}
                        size={16}
                        color={credit ? webTheme.green : webTheme.red}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.extrabold, color: webTheme.text, fontSize: 15 }}>
                        {TX_LABELS[item.type] || item.description || item.task?.title || item.type}
                      </Text>
                      <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12, marginTop: 4 }}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={{ ...type.black, color: credit ? webTheme.green : webTheme.text, fontSize: 18 }}>
                      {credit ? "+" : "-"}
                      {Number(item.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                </SurfaceCard>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
