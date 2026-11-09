import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

type TestUser = {
  id: string;
  name: string | null;
  email: string;
  password: string;
  balance: bigint;
};

const users = new Map<string, TestUser>();
let nextUserId = 1;

const prismaMock = {
  user: {
    create: async ({
      data,
    }: {
      data: { name: string; email: string; password: string };
    }) => {
      if (users.has(data.email)) {
        throw { code: "P2002" };
      }

      const user: TestUser = {
        id: `test-user-${nextUserId++}`,
        name: data.name,
        email: data.email,
        password: data.password,
        balance: 500000n,
      };
      users.set(user.email, user);
      return {
        id: user.id,
        email: user.email,
        balance: user.balance,
      };
    },
    findUnique: async ({ where }: { where: { email: string } }) => {
      const user = users.get(where.email);
      return user
        ? {
            id: user.id,
            email: user.email,
            password: user.password,
            balance: user.balance,
          }
        : null;
    },
  },
};

mock.module("@exness/database", () => ({ prisma: prismaMock }));
process.env.JWT_SECRET =
  "SignupLoginTestKey_2026_01_With_Enough_Entropy_And_Length";
process.env.NODE_ENV = "test";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { app } = await import("../src/app.js");
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The API test server did not bind to a TCP port.");
  }
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/auth`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  users.clear();
  nextUserId = 1;
});

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("signup endpoint", () => {
  it("creates a user, persists the trimmed name, and sets an HTTP-only cookie", async () => {
    const response = await postJson("signup", {
      name: "  Rohit  ",
      email: "  ROHIT@example.com ",
      password: "SecurePassword123",
    });
    const body = await response.json();
    const createdUser = users.get("rohit@example.com");

    expect(response.status).toBe(201);
    expect(createdUser?.name).toBe("Rohit");
    expect(createdUser?.password).not.toBe("SecurePassword123");
    expect(body.user).toEqual({
      id: "test-user-1",
      email: "rohit@example.com",
      balance: "5000.00",
    });
    expect(body).not.toHaveProperty("token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects a missing name", async () => {
    const response = await postJson("signup", {
      email: "rohit@example.com",
      password: "SecurePassword123",
    });

    expect(response.status).toBe(400);
  });

  it("enforces the trimmed name length limits", async () => {
    const tooShort = await postJson("signup", {
      name: " A ",
      email: "short@example.com",
      password: "SecurePassword123",
    });
    const tooLong = await postJson("signup", {
      name: "a".repeat(51),
      email: "long@example.com",
      password: "SecurePassword123",
    });

    expect(tooShort.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const response = await postJson("signup", {
      name: "Rohit",
      email: "not-an-email",
      password: "SecurePassword123",
    });

    expect(response.status).toBe(400);
  });

  it("rejects a weak password", async () => {
    const response = await postJson("signup", {
      name: "Rohit",
      email: "rohit@example.com",
      password: "short",
    });

    expect(response.status).toBe(400);
  });

  it("rejects passwords longer than 72 UTF-8 bytes", async () => {
    const response = await postJson("signup", {
      name: "Rohit",
      email: "rohit@example.com",
      password: `${"a".repeat(71)}é`,
    });

    expect(response.status).toBe(400);
  });

  it("accepts a password of exactly 72 UTF-8 bytes", async () => {
    const response = await postJson("signup", {
      name: "Rohit",
      email: "boundary@example.com",
      password: `${"a".repeat(70)}é`,
    });

    expect(response.status).toBe(201);
  });

  it("rejects duplicate email addresses", async () => {
    const first = await postJson("signup", {
      name: "Rohit",
      email: "rohit@example.com",
      password: "SecurePassword123",
    });
    const duplicate = await postJson("signup", {
      name: "Another Name",
      email: "ROHIT@example.com",
      password: "SecurePassword123",
    });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
  });

  it("rejects unexpected fields", async () => {
    const response = await postJson("signup", {
      name: "Rohit",
      email: "rohit@example.com",
      password: "SecurePassword123",
      role: "admin",
    });

    expect(response.status).toBe(400);
  });
});

describe("login endpoint", () => {
  beforeEach(async () => {
    await postJson("signup", {
      name: "Rohit",
      email: "rohit@example.com",
      password: "SecurePassword123",
    });
  });

  it("logs in without requiring a name and sets an HTTP-only cookie", async () => {
    const response = await postJson("login", {
      email: " ROHIT@example.com ",
      password: "SecurePassword123",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Login successful");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(body).not.toHaveProperty("token");
  });

  it("uses the same generic response for invalid credentials", async () => {
    const response = await postJson("login", {
      email: "rohit@example.com",
      password: "WrongPassword123",
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "Invalid email or password.",
    });
  });

  it("rejects unexpected fields", async () => {
    const response = await postJson("login", {
      name: "Rohit",
      email: "rohit@example.com",
      password: "SecurePassword123",
    });

    expect(response.status).toBe(400);
  });
});
