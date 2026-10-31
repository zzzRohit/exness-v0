import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../generated/prisma/client.js";

const modulePath = fileURLToPath(import.meta.url);
const moduleDirectory = dirname(modulePath);
const databasePackageDirectory = modulePath.includes(`${sep}dist${sep}`)
  ? resolve(moduleDirectory, "../..")
  : resolve(moduleDirectory, "..");

dotenv.config({
  path: resolve(databasePackageDirectory, "../../.env")
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required to initialize the shared Prisma client."
  );
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (globalForPrisma.prisma ??= createPrismaClient());

export type { PrismaClient };
