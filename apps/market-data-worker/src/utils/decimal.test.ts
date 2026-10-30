import { expect, test } from "bun:test";
import { decimalToscaledBigInt } from "./decimal.js";

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