import { PrismaClient } from './generated/client'
import bcrypt from "bcryptjs";

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Create a Coach
    const coach = await prisma.coach.create({
        data: {
            user: {
                create: {
                    email: 'coach@touchline.com',
                    username: 'coach123',
                    password: await bcrypt.hash('coach123', 10),
                    role: 'COACH',
                }
            }
        }
    })

    // Create a Team
    const team = await prisma.team.create({
        data: {
            name: 'Touchline FC',
            coachId: coach.id,
        }
    })

    // Create a Session
    const session = await prisma.session.create({
        data: {
            title: 'Monday Morning Drill',
            date: new Date(),
            coachId: coach.id,
        }
    })

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
