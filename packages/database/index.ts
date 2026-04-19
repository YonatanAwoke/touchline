import { PrismaClient } from "./generated/client"

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") {
  // If the existing singleton is missing the new models, recreate it
  if (prisma && (!(prisma as any).todo || !(prisma as any).formation || !(prisma as any).tacticalBoard || !(prisma as any).matchAnalysis || !(prisma as any).playerAnalysis)) {
    console.warn("[Prisma] New models missing in client. Recreating...");
    globalThis.prisma = prismaClientSingleton()
  } else {
    globalThis.prisma = prisma
  }
}

const finalClient = globalThis.prisma ?? prisma

export default finalClient

export * from "./generated/client"
