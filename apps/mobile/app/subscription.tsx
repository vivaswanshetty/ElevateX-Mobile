import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { AppStackHeader } from "../components/AppStackHeader";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { SurfaceCard } from "../components/SurfaceCard";
import { HapticPressable } from "../components/HapticPressable";
import { useAuthStore } from "../stores/authStore";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { notify } from "../stores/toastStore";
import { purchaseSubscription, type BillingCycle, type SubscriptionPlan } from "../lib/payment";
import { normalizeUserPayload } from "../lib/user";

// Plan prices in smallest unit (paise) for Razorpay
const PLAN_PRICES: Record<SubscriptionPlan, Record<BillingCycle, number>> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 299, yearly: 3399 },
  elite: { monthly: 999, yearly: 8599 },
};

const plans = [
  {
    id: "free" as SubscriptionPlan,
    name: "Starter",
    tagline: "Get started for free.",
    icon: "star",
    iconBg: "rgba(255,255,255,0.1)",
    accent: webTheme.muted,
    features: ["50 Daily Login Coins", "Basic Task Access", "Community Support", "Standard Profile"],
  },
  {
    id: "pro" as SubscriptionPlan,
    name: "Pro",
    tagline: "For serious freelancers.",
    icon: "zap",
    iconBg: "rgba(96,165,250,0.12)",
    accent: webTheme.blue,
    features: ["500 Monthly Coins", "Unlimited Applications", "Verified Pro Badge", "Premium Tasks", "Priority Support"],
  },
  {
    id: "elite" as SubscriptionPlan,
    name: "Elite",
    tagline: "Maximum power.",
    icon: "award",
    iconBg: "rgba(251,191,36,0.12)",
    accent: webTheme.gold,
    features: ["2,500 Monthly Coins", "0% Service Fee", "Dedicated Manager", "Early Feature Access", "Custom Profile Theme"],
  },
];

const planTiers: Record<SubscriptionPlan, number> = { free: 1, pro: 2, elite: 3 };

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const currentPlan = (user?.subscription?.plan ?? "free") as SubscriptionPlan;
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [activatingPlan, setActivatingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan === "free" || plan === currentPlan) return;
    if (activatingPlan) return; // Already processing (covers re-entry)
    setActivatingPlan(plan);
    try {
      const amount = PLAN_PRICES[plan][billingCycle];
      const data = await purchaseSubscription(plan, billingCycle, amount, {
        displayName: user?.displayName,
        email: user?.email,
      });
      // Success
      if (user) {
        setUser(
          normalizeUserPayload({
            _id: user.id,
            name: user.displayName ?? undefined,
            email: user.email ?? undefined,
            xp: user.xp,
            coins: data.newBalance ?? user.tokenBalance,
            subscription: data.subscription ?? { plan, isActive: true },
          })
        );
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      const planName = plans.find((p) => p.id === plan)?.name ?? plan;
      const bonus = data.coinBonus ? ` +${data.coinBonus} coins bonus!` : "";
      notify.success(`${planName} plan activated!${bonus}`);
    } catch (error: any) {
      const isCancelled =
        error?.code === 0 ||
        error?.description?.includes("cancel") ||
        error?.description?.includes("already");
      if (!isCancelled) {
        notify.error(error?.description ?? error?.message ?? "Payment failed.");
      }
    } finally {
      setActivatingPlan(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <AppStackHeader title="Plans & Pricing" detail="Unlock premium features" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Billing Cycle Toggle */}
        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 999, padding: 4, marginBottom: 24, alignSelf: "center", borderWidth: 1, borderColor: webTheme.border }}>
          {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
            <HapticPressable
              key={cycle}
              hapticType="light"
              onPress={() => setBillingCycle(cycle)}
              style={{
                paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999,
                backgroundColor: billingCycle === cycle ? webTheme.surfaceRaised : "transparent",
                borderWidth: 1, borderColor: billingCycle === cycle ? webTheme.border : "transparent",
                flexDirection: "row", alignItems: "center", gap: 6,
              }}
            >
              <Text style={{ ...type.bold, color: billingCycle === cycle ? webTheme.text : webTheme.muted, fontSize: 13, textTransform: "capitalize" }}>
                {cycle}
              </Text>
              {cycle === "yearly" && (
                <View style={{ backgroundColor: webTheme.accentSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 10 }}>Save 20%</Text>
                </View>
              )}
            </HapticPressable>
          ))}
        </View>

        {/* Plan Cards */}
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isLoading = activatingPlan === plan.id;
          const price = PLAN_PRICES[plan.id][billingCycle];
          const priceDisplay = price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`;
          const period = price === 0 ? "" : billingCycle === "monthly" ? "/mo" : "/yr";
          const isDowngrade = planTiers[plan.id] < planTiers[currentPlan];
          const buttonLabel = isCurrent
            ? "Current Plan"
            : plan.id === "free"
            ? "Downgrade to Free"
            : `${isDowngrade ? "Downgrade" : "Upgrade"} to ${plan.name}`;

          return (
            <SurfaceCard
              key={plan.id}
              style={{
                marginBottom: 16, position: "relative", overflow: "hidden",
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent ? plan.accent : "rgba(255,255,255,0.05)",
              }}
            >
              <LinearGradient
                colors={[plan.iconBg, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}
                pointerEvents="none"
              />

              <View style={{ padding: 20 }}>
                {/* Plan header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Feather name={plan.icon as any} size={20} color={plan.accent} />
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 22 }}>{plan.name}</Text>
                  {isCurrent && (
                    <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ ...type.bold, color: webTheme.text, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14 }}>{plan.tagline}</Text>

                {/* Price */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 24, marginBottom: 24 }}>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 36, lineHeight: 40 }}>{priceDisplay}</Text>
                  {period ? (
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 16, marginBottom: 6, marginLeft: 4 }}>{period}</Text>
                  ) : null}
                </View>

                {/* CTA Button */}
                <HapticPressable
                  hapticType="medium"
                  onPress={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || isLoading || !!activatingPlan}
                  style={{
                    backgroundColor: isCurrent
                      ? "rgba(255,255,255,0.05)"
                      : plan.id === "free"
                      ? webTheme.surfaceRaised
                      : plan.accent,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderRadius: 12,
                    marginBottom: 24,
                    opacity: !isCurrent && activatingPlan && !isLoading ? 0.5 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={webTheme.text} />
                  ) : (
                    <Text style={{ ...type.bold, color: isCurrent ? webTheme.muted : plan.id === "free" ? webTheme.textSecondary : "#111", fontSize: 15 }}>
                      {buttonLabel}
                    </Text>
                  )}
                </HapticPressable>

                {/* Features */}
                <View style={{ gap: 12 }}>
                  <Text style={{ ...type.semibold, color: webTheme.text, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>What's Included</Text>
                  {plan.features.map((feat, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
                        <Feather name="check" size={12} color={plan.accent} />
                      </View>
                      <Text style={{ ...type.regular, color: webTheme.textSecondary, fontSize: 14 }}>{feat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </SurfaceCard>
          );
        })}

        {/* Trust note */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, opacity: 0.5 }}>
          <Feather name="lock" size={12} color={webTheme.muted} />
          <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 12 }}>Secured by Razorpay · Cancel anytime</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

