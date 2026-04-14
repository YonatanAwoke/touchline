import prisma from "./packages/database/index";

async function main() {
  try {
    console.log("Checking Prisma Client models...");
    const models = Object.keys(prisma).filter(k => typeof (prisma as any)[k] === "object");
    console.log("Available models:", models.join(", "));
    
    if (models.includes("match")) {
      console.log("Checking 'Match' model fields...");
      const match = await (prisma as any).match.findFirst();
      if (match) {
        console.log("Found a match record. Fields:", Object.keys(match).join(", "));
        console.log("Has tacticalBoardId:", "tacticalBoardId" in match);
      } else {
        console.log("No match record found to check fields directly, but will try a query...");
        try {
          await (prisma as any).match.findFirst({ where: { tacticalBoardId: null } });
          console.log("Query with tacticalBoardId succeeded.");
        } catch (e: any) {
          console.error("Query with tacticalBoardId failed:", e.message);
        }
      }
    } else {
      console.log("'match' model not found in client!");
    }
    
    if (models.includes("tacticalBoard")) {
      console.log("'tacticalBoard' model found in client.");
    } else {
      console.log("'tacticalBoard' model NOT found in client!");
    }
    
  } catch (err: any) {
    console.error("Diagnostic failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
