import { randomUUID } from "node:crypto";
import { prisma } from "@exness/database";
import { comparePassword, hashPassword } from "../utils/password.js";
import type {
  LoginRequest,
  SignupRequest,
} from "../validators/auth.validator.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  balance: string;
}

export class AuthenticationError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "AuthenticationError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  balance: bigint;
}): AuthenticatedUser {
  const sign = user.balance < 0n ? "-" : "";
  const absoluteBalance = user.balance < 0n ? -user.balance : user.balance;
  const dollars = absoluteBalance / 100n;
  const cents = (absoluteBalance % 100n).toString().padStart(2, "0");

  return {
    id: user.id,
    email: user.email,
    balance: `${sign}${dollars.toString()}.${cents}`,
  };
}

export async function signup(
  input: SignupRequest,
): Promise<AuthenticatedUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      // Step 1: Create user
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: passwordHash,
        },
        select: {
          id: true,
          email: true,
          balance: true,
        },
      });

      // Step 2: Create DEMO account
      const account = await tx.account.create({
        data: {
          userId: user.id,
          accountType: "DEMO",
          currency: "USD",
          availableBalance: 500000n,
          lockedBalance: 0n,
        },
      });

      // Step 3: Create initial funding ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          entryType: "INITIAL_FUNDING",
          bucket: "AVAILABLE",
          amount: 500000n,
          operationId: randomUUID(),
          referenceId: account.id,
          description: "Initial DEMO account funding",
        },
      });
      return user;
    });

    return toAuthenticatedUser(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmailAlreadyRegisteredError();
    }
    throw error;
  }
}

export async function login(
  input: LoginRequest,
): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      password: true,
      balance: true,
    },
  });

  if (!user || !(await comparePassword(input.password, user.password))) {
    throw new AuthenticationError();
  }

  return toAuthenticatedUser(user);
}
