export const PRICE_DECIMAL_PLACES = 6;
export const QUANTITY_DECIMAL_PLACES = 8;

export const PRICE_SCALE = 10n ** BigInt(PRICE_DECIMAL_PLACES);
export const QUANTITY_SCALE = 10n ** BigInt(QUANTITY_DECIMAL_PLACES);

export const decimalToScaledBigInt = (
  value: string,
  decimalPlaces: number = 6,
  context?: string,
): bigint => {
  if (typeof value !== "string") {
    throw new Error("Invalid decimal value");
  }

  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new Error("Invalid decimal places");
  }

  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Invalid decimal value");
  }

  const [integerPart, fractionPart = ""] = value.split(".");
  const significantFraction = fractionPart.replace(/0+$/, "");

  if (significantFraction.length > decimalPlaces) {
    const location = context ? ` for ${context}` : "";
    throw new Error(
      `Too many decimal places${location}: "${value}" exceeds ${decimalPlaces} significant fractional digits.`,
    );
  }

  const normalizedInteger = integerPart === "" ? "0" : integerPart;
  const scaledValue = `${normalizedInteger}${significantFraction.padEnd(decimalPlaces, "0")}`;

  return BigInt(scaledValue);
};

export const decimalToscaledBigInt = decimalToScaledBigInt;

export default decimalToScaledBigInt;