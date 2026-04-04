import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppStackHeader } from "../components/AppStackHeader";
import { ScreenBackdrop } from "../components/ScreenBackdrop";
import { SurfaceCard } from "../components/SurfaceCard";
import { HapticPressable } from "../components/HapticPressable";
import { useAuthStore } from "../stores/authStore";
import { type } from "../lib/typography";
import { webTheme } from "../lib/webTheme";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { notify } from "../stores/toastStore";

const plans = [
  {
    id: "free",
    name: "Starter",
    tagline: "Get started for free.",
    icon: "star",
    iconBg: "rgba(255,255,255,0.1)",
    accent: webTheme.muted,
    priceDisplay: "Free",
    period: "",
    coinBonus: "0 Coins",
    features: ["50 Daily Login Coins", "Basic Task Access", "Community Support", "Standard Profile"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious freelancers.",
    icon: "zap",
    iconBg: "rgba(96,165,250,0.12)",
    accent: webTheme.blue,
    priceDisplay: "₹299",
    period: "/mo",
    coinBonus: "500 Coins/mo",
    features: ["500 Monthly Coins", "Unlimited Applications", "Verified Pro Badge", "Premium Tasks", "Priority Support"],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Maximum power.",
    icon: "award",
    iconBg: "rgba(251,191,36,0.12)",
    accent: webTheme.gold,
    priceDisplay: "₹999",
    period: "/mo",
    coinBonus: "2,500 Coins/mo",
    features: ["2,500 Monthly Coins", "0% Service Fee", "Dedicated Manager", "Early Feature Access", "Custom Profile Theme"],
  }
];

export default function SubscriptionScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const currentPlan = currentUser?.subscription?.plan || "free";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const handleSubscribe = (planId: string) => {
    if (planId === "free" && currentPlan === "free") return;
    setPendingPlanId(planId);
    setConfirmVisible(true);
  };

  const executePlanChange = () => {
    if (!pendingPlanId || !currentUser) return;
    
    // Save previous for exact wording
    const previousPlanId = currentPlan;
    
    setUser({
      ...currentUser,
      subscription: {
        ...currentUser.subscription,
        plan: pendingPlanId as "free" | "pro" | "elite",
        isActive: true,
      }
    });
    
    setConfirmVisible(false);
    
    const planTiers = { free: 1, pro: 2, elite: 3 } as const;
    const isDowngrade = planTiers[pendingPlanId as keyof typeof planTiers] < planTiers[previousPlanId as keyof typeof planTiers];
    
    notify.success(`${isDowngrade ? "Downgraded" : "Upgraded"} to ${plans.find(p => p.id === pendingPlanId)?.name} successfully.`);
    setPendingPlanId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: webTheme.bg }}>
      <ScreenBackdrop />
      <AppStackHeader title="Plans & Pricing" detail="Unlock premium features" />
      
      {(() => {
        if (!pendingPlanId) return null;
        const planTiers = { free: 1, pro: 2, elite: 3 } as const;
        const isDowngrade = planTiers[pendingPlanId as keyof typeof planTiers] < planTiers[currentPlan as keyof typeof planTiers];
        const actionText = isDowngrade ? "Downgrade" : "Upgrade";
        const selectedPlan = plans.find(p => p.id === pendingPlanId);

        return (
            <ConfirmDialog 
                visible={confirmVisible} 
                title={`Confirm ${actionText}`} 
                detail={`Simulate a mockup ${actionText.toLowerCase()} to the ${selectedPlan?.name} plan? In web, this loads Razorpay.`}
                icon="credit-card"
                confirmLabel="Simulate Payment" 
                cancelLabel="Cancel" 
                onConfirm={executePlanChange} 
                onClose={() => setConfirmVisible(false)} 
            />
        );
      })()}
      
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Toggle Billing Cycle */}
        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 999, padding: 4, marginBottom: 24, alignSelf: "center", borderWidth: 1, borderColor: webTheme.border }}>
          <HapticPressable
            hapticType="light"
            onPress={() => setBillingCycle("monthly")}
            style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: billingCycle === "monthly" ? webTheme.surfaceRaised : "transparent", borderWidth: 1, borderColor: billingCycle === "monthly" ? webTheme.border : "transparent" }}
          >
            <Text style={{ ...type.bold, color: billingCycle === "monthly" ? webTheme.text : webTheme.muted, fontSize: 13 }}>Monthly</Text>
          </HapticPressable>
          <HapticPressable
            hapticType="light"
            onPress={() => setBillingCycle("yearly")}
            style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: billingCycle === "yearly" ? webTheme.surfaceRaised : "transparent", borderWidth: 1, borderColor: billingCycle === "yearly" ? webTheme.border : "transparent", flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Text style={{ ...type.bold, color: billingCycle === "yearly" ? webTheme.text : webTheme.muted, fontSize: 13 }}>Yearly</Text>
            <View style={{ backgroundColor: webTheme.accentSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ ...type.bold, color: webTheme.accent, fontSize: 10 }}>Save 20%</Text>
            </View>
          </HapticPressable>
        </View>

        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          
          let displayPrice = plan.priceDisplay;
          let currentPeriod = plan.period;
          if (billingCycle === "yearly" && plan.id !== "free") {
            if (plan.id === "pro") displayPrice = "₹3,399";
            if (plan.id === "elite") displayPrice = "₹8,599";
            currentPeriod = "/yr";
          }

          return (
            <SurfaceCard key={plan.id} style={{ marginBottom: 16, position: "relative", overflow: "hidden", borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? plan.accent : "rgba(255,255,255,0.05)" }}>
              <LinearGradient
                colors={[plan.iconBg, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }}
              />
              
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <Feather name={plan.icon as any} size={20} color={plan.accent} />
                      <Text style={{ ...type.black, color: webTheme.text, fontSize: 22 }}>
                        {plan.name}
                      </Text>
                      {isCurrent && (
                        <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ ...type.bold, color: webTheme.text, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 14 }}>
                      {plan.tagline}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 24, marginBottom: 24 }}>
                  <Text style={{ ...type.black, color: webTheme.text, fontSize: 36, lineHeight: 40 }}>{displayPrice}</Text>
                  <Text style={{ ...type.regular, color: webTheme.muted, fontSize: 16, marginBottom: 6, marginLeft: 4 }}>{currentPeriod}</Text>
                </View>

                <HapticPressable
                  hapticType="medium"
                  onPress={() => handleSubscribe(plan.id)}
                  style={{
                    backgroundColor: isCurrent ? "rgba(255,255,255,0.05)" : plan.accent,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderRadius: 12,
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ ...type.bold, color: isCurrent ? webTheme.text : "#111", fontSize: 15 }}>
                    {isCurrent 
                      ? "Current Plan" 
                      : (() => {
                          const planTiers = { free: 1, pro: 2, elite: 3 } as const;
                          const isDowngrade = planTiers[plan.id as keyof typeof planTiers] < planTiers[currentPlan as keyof typeof planTiers];
                          return `${isDowngrade ? "Downgrade" : "Upgrade"} to ${plan.name}`;
                        })()
                    }
                  </Text>
                </HapticPressable>

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
      </ScrollView>
    </SafeAreaView>
  );
}