export const DEMO_ACCOUNT_BALANCE = 5_000;

export interface DemoAccountSummary {
  balance: number;
  currency: "USD";
  accountId: string;
  accountType: "Demo";
}

export const MOCK_DEMO_ACCOUNT: DemoAccountSummary = {
  balance: DEMO_ACCOUNT_BALANCE,
  currency: "USD",
  accountId: "Demo account",
  accountType: "Demo",
};
