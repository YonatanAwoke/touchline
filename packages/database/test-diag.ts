import prisma from "./index";

async function test() {
  console.log("Checking prisma client...");
  if (!prisma) {
    console.error("Prisma client is null!");
    process.exit(1);
  }
  
  console.log("Checking prisma.todo...");
  if (!(prisma as any).todo) {
    console.error("prisma.todo model is missing!");
    // check all models
    console.log("Available models:", Object.keys(prisma).filter(k => !k.startsWith("_") && !k.startsWith("$")));
    process.exit(1);
  }

  try {
    console.log("Querying todos...");
    const count = await (prisma as any).todo.count();
    console.log("Todo count:", count);
    
    console.log("Querying with filter...");
    const filtered = await (prisma as any).todo.findMany({
      where: { matchId: null, sessionId: null }
    });
    console.log("Filtered todos:", filtered.length);
    
    console.log("Success!");
  } catch (error: any) {
    console.error("Query failed:", error.message);
    if (error.code) console.error("Error code:", error.code);
  }
}

test();
