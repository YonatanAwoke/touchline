
import { PrismaClient } from "@touchline/database";
import { getVideoUrl } from "../src/lib/upload";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking analysis jobs...");
    const jobs = await prisma.analysisJob.findMany({
        include: {
            video: true,
            results: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    if (jobs.length === 0) {
        console.log("No analysis jobs found.");
        return;
    }

    console.log(`Found ${jobs.length} recent jobs:`);
    console.log("---------------------------------------------------");

    for (const job of jobs) {
        console.log(`Job ID:      ${job.id}`);
        console.log(`Status:      ${job.status}`);
        console.log(`Video URL:   ${getVideoUrl(job.video.storagePath)}`);
        console.log(`Created:     ${job.createdAt.toLocaleString()}`);
        if (job.finishedAt) {
            console.log(`Finished:    ${job.finishedAt.toLocaleString()}`);
        }
        console.log(`Results:     ${job.results.length} result entries`);

        if (job.status === 'FAILED') {
            // If we had error logs in DB we would show them, but currently we just have status
            console.log(`⚠️  Job Failed. Check worker logs for details.`);
        } else if (job.status === 'COMPLETED') {
            console.log(`✅ Job Completed Successfully`);
        }

        console.log("---------------------------------------------------");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
