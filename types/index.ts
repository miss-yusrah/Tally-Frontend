export interface User {
  id: string;
  email: string;
  displayName: string;
  homeCurrency: string;
  image?: string;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  /**
   * Set (server-side, once) when the trip's first expense is logged.
   * While non-null the base currency can never change — enforced by a
   * DB trigger, surfaced as microcopy on the Create Trip screen.
   */
  baseCurrencyLockedAt: string | null;
  inviteToken: string;
  createdBy: string;
  createdAt: string;
}

export interface TripMember {
  userId: string;
  tripId: string;
  displayName: string;
  avatarUrl?: string;
  role: "organizer" | "member";
  joinedAt: string;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "lodging"
  | "activities"
  | "other";

export interface ExpenseSplit {
  userId: string;
  amountMinorUnits: number;
}

export type FxRateSource = "live" | "cached";

export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  createdBy: string;
  /** Original amount, integer minor units of `currency`. */
  amountMinorUnits: number;
  /** Original (paid-in) currency. */
  currency: string;
  /**
   * Converted amount, integer minor units of the trip's base currency.
   * BALANCES (4.6): always sum this via getExpenseAmountForBalances() —
   * never amountMinorUnits.
   */
  baseCurrencyAmount: number;
  /** Exchange rate as a decimal string (e.g. "1543.20") — never a float. */
  fxRate: string;
  /** Convenience mirror of rateSource === "cached". */
  fxCached: boolean;
  /** When the rate was fetched live, or when the cached rate was stored. */
  rateTimestamp: string;
  rateSource: FxRateSource;
  /** OCR produced an unrecognized currency code; defaulted to trip base. */
  needsCurrencyReview: boolean;
  category: ExpenseCategory | null;
  note?: string;
  merchant?: string;
  splitMethod: "equal" | "custom";
  splitMap: ExpenseSplit[];
  ocrSource: boolean;
  receiptImageUrl?: string;
  createdAt: string;
  /** Optimistic entries pending server confirmation */
  _optimistic?: boolean;
}

export interface AddExpenseInput {
  amountMinorUnits: number;
  currency: string;
  payerId: string;
  splitMethod: "equal" | "custom";
  splitMap: ExpenseSplit[];
  category: ExpenseCategory | null;
  note?: string;
  receiptImageUrl?: string;
  /** Resolved server-side before save — see /api/fx/rate. */
  fx: {
    convertedAmountMinorUnits: number;
    rate: string;
    rateTimestamp: string;
    rateSource: FxRateSource;
  };
  needsCurrencyReview: boolean;
}

export interface Settlement {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  /** Integer minor units in the trip's base currency. */
  amountMinorUnits: number;
  currency: string;
  /** User who confirmed the off-app payment (must be fromUserId / payer). */
  confirmedBy: string;
  /** Client-generated UUID at confirm tap — unique insert guard for idempotency. */
  idempotencyToken: string;
  status: "confirmed";
  settledAt: string;
  /** Optimistic entries pending server confirmation */
  _optimistic?: boolean;
}

export interface Balance {
  userId: string;
  displayName: string;
  netMinorUnits: number;
}

export interface SimplifiedPayment {
  fromUserId: string;
  toUserId: string;
  amountMinorUnits: number;
}

/** Per-trip balance snapshot written by balanceStore.recomputeBalances. */
export interface TripBalanceSnapshot {
  netPositions: Record<string, number>;
  simplifiedDebts: SimplifiedPayment[];
  memberBalances: Balance[];
}

export interface FXRate {
  baseCurrency: string;
  targetCurrency: string;
  /** Decimal string, e.g. "1543.20" — never a float. */
  rate: string;
  fetchedAt: string;
  cached: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export type NotificationType =
  | "member_joined"
  | "expense_logged"
  | "settlement_confirmed";

export interface MemberJoinedPayload {
  /** Organizer sees "joined your trip"; other members see invite copy. */
  recipientRole?: "organizer" | "member";
}

export interface ExpenseLoggedPayload {
  amount: number;
  currency: string;
  category: ExpenseCategory | null;
  note?: string;
}

export interface SettlementConfirmedPayload {
  amount: number;
  currency: string;
  fromUserId: string;
  toUserId: string;
}

export type NotificationPayload =
  | MemberJoinedPayload
  | ExpenseLoggedPayload
  | SettlementConfirmedPayload;

/**
 * Denormalized activity alert.
 * Dynamo key shape (when Dynamo is used): NOTIFICATION#userId#createdAt#id
 * with GSI on userId + createdAt (desc).
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  tripId: string;
  tripName: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  payload: NotificationPayload;
  read: boolean;
  createdAt: string;
}
