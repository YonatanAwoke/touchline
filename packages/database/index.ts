import { PrismaClient } from "./generated/client"

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") {
  // If the existing singleton is missing the new 'todo' model, recreate it
  if (prisma && !(prisma as any).todo) {
    console.warn("[Prisma] 'todo' model missing in client. Recreating...");
    globalThis.prisma = prismaClientSingleton()
  } else {
    globalThis.prisma = prisma
  }
}

const finalClient = globalThis.prisma ?? prisma

export default finalClient

export * from "./generated/client"
