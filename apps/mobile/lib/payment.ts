import RazorpayCheckout from "react-native-razorpay";
import { AppState } from "react-native";
import { api } from "./api";

export interface RazorpaySuccessData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorData {
  code: number;
  description: string;
}

export type BillingCycle = "monthly" | "yearly";
export type SubscriptionPlan = "free" | "pro" | "elite";

interface CreateOrderOptions {
  amount: number;
  type: "subscription" | "deposit";
  plan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
  currency?: "INR" | "USD";
}

interface CreateOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

// Creates a Razorpay order via our backend
async function createRazorpayOrder(options: CreateOrderOptions): Promise<CreateOrderResult> {
  const data = await api.post("/api/payments/create-order", options);
  return {
    orderId: data.orderId,
    keyId: data.keyId,
    amount: data.amount,
    currency: data.currency,
  };
}

// ─── Singleton promise dedup ────────────────────────────────────
// Instead of a boolean lock (which Metro hot-reload resets), we store the
// actual in-flight Promise.  If a second call arrives while one is pending
// we return the SAME promise — no new network call, no new Razorpay sheet.
let _pendingPayment: Promise<any> | null = null;

function openSheet(
  order: CreateOrderResult,
  user: { displayName?: string | null; email?: string | null }
): Promise<RazorpaySuccessData> {
  const opts = {
    key: order.keyId,
    amount: String(order.amount),
    order_id: order.orderId,
    currency: order.currency,
    name: "ElevateX",
    description: "ElevateX Payment",
    prefill: {
      name: user.displayName || "",
      email: user.email || "",
    },
    theme: { color: "#E5364B" },
  };
  return RazorpayCheckout.open(opts) as Promise<RazorpaySuccessData>;
}

interface VerifyPaymentOptions {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount?: number;
  type?: "subscription" | "deposit";
  plan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
}

async function verifyPayment(options: VerifyPaymentOptions) {
  return api.post("/api/payments/verify-payment", options);
}

// ─── Public API ─────────────────────────────────────────────────

let _lastPaymentTime = 0;
const COOLDOWN_MS = 3000;

export async function purchaseSubscription(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle,
  amount: number,
  user: { displayName?: string | null; email?: string | null }
) {
  const now = Date.now();
  if (now - _lastPaymentTime < COOLDOWN_MS) {
    console.log("[Payment] purchaseSubscription ignored: click cooldown active.");
    throw { code: 0, description: "Click rate-limited" };
  }

  // If a payment is already in flight, return the SAME promise (dedup)
  if (_pendingPayment) return _pendingPayment;

  _lastPaymentTime = now;
  _pendingPayment = (async () => {
    try {
      const order = await createRazorpayOrder({ amount, type: "subscription", plan, billingCycle });
      const pd = await openSheet(order, user);
      return await verifyPayment({ ...pd, type: "subscription", plan, billingCycle });
    } finally {
      _lastPaymentTime = Date.now();
    }
  })();

  try {
    return await _pendingPayment;
  } finally {
    _pendingPayment = null;
  }
}

export async function depositCoins(
  amount: number,
  user: { displayName?: string | null; email?: string | null }
) {
  const now = Date.now();
  if (now - _lastPaymentTime < COOLDOWN_MS) {
    console.log("[Payment] depositCoins ignored: click cooldown active.");
    throw { code: 0, description: "Click rate-limited" };
  }

  if (_pendingPayment) return _pendingPayment;

  _lastPaymentTime = now;
  _pendingPayment = (async () => {
    try {
      const order = await createRazorpayOrder({ amount, type: "deposit" });
      const pd = await openSheet(order, user);
      return await verifyPayment({ ...pd, amount, type: "deposit" });
    } finally {
      _lastPaymentTime = Date.now();
    }
  })();

  try {
    return await _pendingPayment;
  } finally {
    _pendingPayment = null;
  }
}
