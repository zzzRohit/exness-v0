import { expect, test } from "bun:test";
import {
  decimalToscaledBigInt,
  PRICE_DECIMAL_PLACES,
  QUANTITY_DECIMAL_PLACES,
} from "./decimal.js";

test("converts integer prices", () => {
  expect(decimalToscaledBigInt("12")).toBe(12000000n);
  expect(decimalToscaledBigInt("0")).toBe(0n);
});

test("converts fractional prices", () => {
  expect(decimalToscaledBigInt("12.34")).toBe(12340000n);
  expect(decimalToscaledBigInt("0.123456")).toBe(123456n);
});

test("handles leading zeros and trailing zeros", () => {
  expect(decimalToscaledBigInt("00012.3400")).toBe(12340000n);
  expect(decimalToscaledBigInt("000.010")).toBe(10000n);
  expect(decimalToscaledBigInt("1.2300")).toBe(1230000n);
  expect(decimalToscaledBigInt("77380.00000000", PRICE_DECIMAL_PLACES)).toBe(
    77_380_000_000n,
  );
  expect(decimalToscaledBigInt("0.48204000", QUANTITY_DECIMAL_PLACES)).toBe(
    48_204_000n,
  );
});

test("accepts excess fractional digits only when they are trailing zeros", () => {
  expect(decimalToscaledBigInt("1.2345670000", PRICE_DECIMAL_PLACES)).toBe(
    1_234_567n,
  );
  expect(() =>
    decimalToscaledBigInt("1.2345670001", PRICE_DECIMAL_PLACES, "BTC bidPrice"),
  ).toThrow('Too many decimal places for BTC bidPrice: "1.2345670001"');
});

test("rejects invalid decimal strings", () => {
  expect(() => decimalToscaledBigInt("abc")).toThrow("Invalid decimal value");
  expect(() => decimalToscaledBigInt("12.34.56")).toThrow("Invalid decimal value");
  expect(() => decimalToscaledBigInt(".5")).toThrow("Invalid decimal value");
});

test("rejects excessive precision and invalid precision parameters", () => {
  expect(() => decimalToscaledBigInt("1.2345678")).toThrow("Too many decimal places");
  expect(() => decimalToscaledBigInt("1.23", -1)).toThrow("Invalid decimal places");
  expect(() => decimalToscaledBigInt("1.23", Number.NaN)).toThrow("Invalid decimal places");
});