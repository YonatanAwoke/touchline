import { PrismaClient } from './generated/client'
import bcrypt from "bcryptjs";

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // 1. Create a Default Organization
    const org = await prisma.organization.upsert({
        where: { name: 'Touchline Academy' },
        update: {},
        create: {
            name: 'Touchline Academy',
        },
    });

    // 2. Create a Club Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@touchline.com' },
        update: {},
        create: {
            email: 'admin@touchline.com',
            username: 'touchline_admin',
            password: await bcrypt.hash('admin123', 10),
            role: 'CLUB_ADMIN',
            organizationId: org.id,
        }
    });

    // 3. Create a Coach
    const coachUser = await prisma.user.upsert({
        where: { email: 'coach@touchline.com' },
        update: {},
        create: {
            email: 'coach@touchline.com',
            username: 'coach123',
            password: await bcrypt.hash('coach123', 10),
            role: 'COACH',
            organizationId: org.id,
            coachProfile: {
                create: {},
            },
        },
        include: {
            coachProfile: true,
        }
    });

    const coachProfileId = coachUser.coachProfile?.id;

    if (coachProfileId) {
        // 4. Create a Team
        const team = await prisma.team.create({
            data: {
                name: 'Elite Squad',
                organizationId: org.id,
                coachId: coachProfileId,
            }
        });

        // 5. Create a Session
        await prisma.session.create({
            data: {
                title: 'Technical Mastery',
                date: new Date(),
                organizationId: org.id,
                coachId: coachProfileId,
            }
        });
    }

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
