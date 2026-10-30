export const decimalToScaledBigInt = (
  value: string,
  decimalPlaces: number = 6,
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

  if (fractionPart.length > decimalPlaces) {
    throw new Error("Too many decimal places");
  }

  const normalizedInteger = integerPart === "" ? "0" : integerPart;
  const scaledValue = `${normalizedInteger}${fractionPart.padEnd(decimalPlaces, "0")}`;

  return BigInt(scaledValue);
};

export const decimalToscaledBigInt = decimalToScaledBigInt;

export default decimalToScaledBigInt;