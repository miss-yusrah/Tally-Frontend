import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeNetBalances,
  simplifyDebts,
} from "./debt-simplification";

describe("simplifyDebts", () => {
  it("resolves a simple 2-person debt in one payment", () => {
    const payments = simplifyDebts({
      alice: 5000,
      bob: -5000,
    });

    assert.equal(payments.length, 1);
    assert.equal(payments[0].fromUserId, "bob");
    assert.equal(payments[0].toUserId, "alice");
    assert.equal(payments[0].amountMinorUnits, 5000);
  });

  it("chains multiple payments for 3+ members", () => {
    // Ada +12000, Tunde -7000, Bola -5000
    const payments = simplifyDebts({
      ada: 12000,
      tunde: -7000,
      bola: -5000,
    });

    assert.ok(payments.length >= 2);
    assert.ok(payments.length <= 2); // N+M-1 = 2 for 1 creditor + 2 debtors

    const total = payments.reduce((s, p) => s + p.amountMinorUnits, 0);
    assert.equal(total, 12000);

    for (const p of payments) {
      assert.ok(Number.isInteger(p.amountMinorUnits));
      assert.ok(p.amountMinorUnits > 0);
    }
  });

  it("returns empty when everyone is already settled", () => {
    const payments = simplifyDebts({
      ada: 0,
      bob: 0,
      cara: 0,
    });
    assert.deepEqual(payments, []);
  });

  it("omits zero-balance members mixed with non-zero members", () => {
    const payments = simplifyDebts({
      creditor: 3000,
      settled: 0,
      debtor: -3000,
    });

    assert.equal(payments.length, 1);
    assert.equal(payments[0].amountMinorUnits, 3000);
    assert.ok(!payments.some((p) => p.fromUserId === "settled"));
    assert.ok(!payments.some((p) => p.toUserId === "settled"));
  });
});

describe("computeNetBalances", () => {
  it("credits payer with base-currency amount and debits scaled splits", () => {
    const balances = computeNetBalances(
      ["ada", "bob"],
      [
        {
          payerId: "ada",
          amountMinorUnits: 10000,
          baseCurrencyAmount: 10000,
          splitMap: [
            { userId: "ada", amountMinorUnits: 5000 },
            { userId: "bob", amountMinorUnits: 5000 },
          ],
        },
      ]
    );

    assert.equal(balances.ada, 5000);
    assert.equal(balances.bob, -5000);
  });

  it("nets mixed-currency expenses when each member paid one bill", () => {
    // USD $50 → ₦68,951.14; ₦15,000 lodging — ada paid USD, bob paid NGN.
    const balances = computeNetBalances(
      ["ada", "bob"],
      [
        {
          payerId: "ada",
          amountMinorUnits: 5000,
          baseCurrencyAmount: 6895114,
          splitMap: [
            { userId: "ada", amountMinorUnits: 2500 },
            { userId: "bob", amountMinorUnits: 2500 },
          ],
        },
        {
          payerId: "bob",
          amountMinorUnits: 1500000,
          baseCurrencyAmount: 1500000,
          splitMap: [
            { userId: "ada", amountMinorUnits: 750000 },
            { userId: "bob", amountMinorUnits: 750000 },
          ],
        },
      ]
    );

    assert.equal(balances.ada, 2697557);
    assert.equal(balances.bob, -2697557);
  });

  it("applies settlements before simplification input", () => {
    const balances = computeNetBalances(
      ["ada", "bob"],
      [
        {
          payerId: "ada",
          amountMinorUnits: 10000,
          baseCurrencyAmount: 10000,
          splitMap: [
            { userId: "ada", amountMinorUnits: 5000 },
            { userId: "bob", amountMinorUnits: 5000 },
          ],
        },
      ],
      [{ fromUserId: "bob", toUserId: "ada", amountMinorUnits: 2000 }]
    );

    assert.equal(balances.ada, 3000);
    assert.equal(balances.bob, -3000);
  });
});

describe("integration", () => {
  it("never needs more than N+M-1 transactions", () => {
    const balances = {
      c1: 8000,
      c2: 4000,
      d1: -6000,
      d2: -6000,
      settled: 0,
    };

    const creditors = Object.values(balances).filter((v) => v > 0).length;
    const debtors = Object.values(balances).filter((v) => v < 0).length;
    const payments = simplifyDebts(balances);

    assert.ok(payments.length <= creditors + debtors - 1);
    assert.equal(
      payments.reduce((s, p) => s + p.amountMinorUnits, 0),
      12000
    );
  });
});
