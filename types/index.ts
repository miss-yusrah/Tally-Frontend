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

export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  createdBy: string;
  amountMinorUnits: number;
  currency: string;
  baseCurrencyAmount: number;
  fxRate: number;
  fxCached: boolean;
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
}

export interface Settlement {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountMinorUnits: number;
  currency: string;
  settledAt: string;
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

export interface FXRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: string;
  cached: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
