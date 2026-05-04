import { PrismaClient, Role, Position, DominantFoot, ProfileVisibility, SessionType, SessionStatus, AttendanceStatus, MatchResult, CompetitionType, VideoStatus, VideoType, ClipSource, AnalysisStatus, AnalysisType } from './generated/client';
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database with comprehensive demo data...');

    // Optionally cleanup dynamic data to prevent duplicate bloat across runs
    await prisma.metric.deleteMany();
    await prisma.todo.deleteMany();
    await prisma.scorer.deleteMany();
    await prisma.matchResult.deleteMany();
    await prisma.formationPosition.deleteMany();
    await prisma.tacticalBoard.deleteMany();
    await prisma.matchAnalysis.deleteMany();
    await prisma.playerAnalysis.deleteMany();
    await prisma.videoClip.deleteMany();
    await prisma.analysisJob.deleteMany();
    await prisma.video.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.session.deleteMany();
    await prisma.match.deleteMany();
    await prisma.formation.deleteMany();

    // 1. Create a Default Organization
    const org = await prisma.organization.upsert({
        where: { name: 'Touchline Academy' },
        update: {},
        create: {
            name: 'Touchline Academy',
            slug: 'touchline-academy',
            description: 'Premier youth and professional football development academy.',
            joinCode: 'JOIN123',
            contactEmail: 'contact@touchline.com',
            contactPhone: '+1234567890'
        },
    });
    console.log('✅ Organization synced');

    // 2. Global SUPER_ADMIN
    await prisma.user.upsert({
        where: { email: 'super@touchline.com' },
        update: {},
        create: {
            email: 'super@touchline.com',
            username: 'superadmin',
            firstName: 'Super',
            lastName: 'Admin',
            password: await bcrypt.hash('super123', 10),
            role: 'SUPER_ADMIN',
            organizationId: org.id
        }
    });

    // 3. Create a Club Admin
    await prisma.user.upsert({
        where: { email: 'admin@touchline.com' },
        update: {},
        create: {
            email: 'admin@touchline.com',
            username: 'touchline_admin',
            firstName: 'Club',
            lastName: 'Admin',
            password: await bcrypt.hash('admin123', 10),
            role: 'CLUB_ADMIN',
            organizationId: org.id,
        }
    });

    // 4. Create a Coach
    const coachUser = await prisma.user.upsert({
        where: { email: 'coach@touchline.com' },
        update: {},
        create: {
            email: 'coach@touchline.com',
            username: 'headcoach',
            firstName: 'Jurgen',
            lastName: 'Klopp',
            password: await bcrypt.hash('coach123', 10),
            role: 'COACH',
            organizationId: org.id,
            coachProfile: {
                create: {
                    bio: 'Experienced head coach with a passion for high-intensity pressing.',
                    specialty: ['Tactical', 'Gegenpressing', 'Motivation'],
                    licenseLevel: ['UEFA Pro']
                },
            },
        },
        include: { coachProfile: true }
    });
    console.log('✅ Admins & Coach synced');

    const coachProfileId = coachUser.coachProfile?.id;
    if (!coachProfileId) throw new Error("Coach profile creation failed");

    // 5. Create a Team
    const team = await prisma.team.upsert({
        where: { id: 1 }, // Note: assuming id 1 or we can query by name
        update: { coachId: coachProfileId },
        create: {
            name: 'First Team',
            organizationId: org.id,
            coachId: coachProfileId,
        }
    });
    console.log('✅ Team synced');

    // 6. Create Players (Squad of 11)
    const playersData = [
        { first: 'Alisson', last: 'Becker', pos: 'GK' as Position, num: 1, height: 191, weight: 84, foot: 'RIGHT' as DominantFoot },
        { first: 'Trent', last: 'Alexander-Arnold', pos: 'RB' as Position, num: 66, height: 175, weight: 69, foot: 'RIGHT' as DominantFoot },
        { first: 'Virgil', last: 'van Dijk', pos: 'CB' as Position, num: 4, height: 193, weight: 92, foot: 'RIGHT' as DominantFoot },
        { first: 'Ibrahima', last: 'Konate', pos: 'CB' as Position, num: 5, height: 194, weight: 95, foot: 'RIGHT' as DominantFoot },
        { first: 'Andrew', last: 'Robertson', pos: 'LB' as Position, num: 26, height: 178, weight: 64, foot: 'LEFT' as DominantFoot },
        { first: 'Alexis', last: 'Mac Allister', pos: 'CM' as Position, num: 10, height: 176, weight: 72, foot: 'RIGHT' as DominantFoot },
        { first: 'Dominik', last: 'Szoboszlai', pos: 'CM' as Position, num: 8, height: 186, weight: 74, foot: 'RIGHT' as DominantFoot },
        { first: 'Wataru', last: 'Endo', pos: 'DM' as Position, num: 3, height: 178, weight: 76, foot: 'RIGHT' as DominantFoot },
        { first: 'Mohamed', last: 'Salah', pos: 'RW' as Position, num: 11, height: 175, weight: 71, foot: 'LEFT' as DominantFoot },
        { first: 'Darwin', last: 'Nunez', pos: 'ST' as Position, num: 9, height: 187, weight: 81, foot: 'RIGHT' as DominantFoot },
        { first: 'Luis', last: 'Diaz', pos: 'LW' as Position, num: 7, height: 180, weight: 73, foot: 'RIGHT' as DominantFoot },
    ];

    const playerRecords = [];
    for (const p of playersData) {
        const username = `player_${p.first.toLowerCase()}_${p.last.toLowerCase().replace(/[^a-z]/g, '')}`;
        const email = `${username}@touchline.com`;

        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                username,
                firstName: p.first,
                lastName: p.last,
                password: await bcrypt.hash('player123', 10),
                role: 'PLAYER',
                organizationId: org.id,
                playerProfile: {
                    create: {
                        teamId: team.id,
                        position: p.pos,
                        heightCm: p.height,
                        weightKg: p.weight,
                        dominantFoot: p.foot,
                        nationality: 'International',
                        profileVisibility: 'PUBLIC' as ProfileVisibility,
                        isActive: true
                    }
                }
            },
            include: { playerProfile: true }
        });
        playerRecords.push(user.playerProfile!);
    }
    console.log('✅ Players synced');

    // 7. Formations
    const formation = await prisma.formation.create({
        data: {
            name: '4-3-3 Attack',
            template: '4-3-3',
            teamId: team.id,
            isActive: true,
            positions: {
                create: [
                    { role: 'GK', x: 50, y: 10, playerId: playerRecords[0].id },
                    { role: 'RB', x: 90, y: 30, playerId: playerRecords[1].id },
                    { role: 'CB', x: 65, y: 25, playerId: playerRecords[2].id },
                    { role: 'CB', x: 35, y: 25, playerId: playerRecords[3].id },
                    { role: 'LB', x: 10, y: 30, playerId: playerRecords[4].id },
                    { role: 'RCM', x: 75, y: 55, playerId: playerRecords[5].id },
                    { role: 'LCM', x: 25, y: 55, playerId: playerRecords[6].id },
                    { role: 'CDM', x: 50, y: 45, playerId: playerRecords[7].id },
                    { role: 'RW', x: 80, y: 80, playerId: playerRecords[8].id },
                    { role: 'ST', x: 50, y: 90, playerId: playerRecords[9].id },
                    { role: 'LW', x: 20, y: 80, playerId: playerRecords[10].id },
                ]
            }
        }
    });
    console.log('✅ Formation synced');

    // 8. Tactical Board
    await prisma.tacticalBoard.create({
        data: {
            name: 'Match Preparation vs Rivals',
            teamId: team.id,
            organizationId: org.id,
            createdBy: coachUser.id,
            formationId: formation.id,
            annotations: JSON.stringify([{ type: 'arrow', start: { x: 80, y: 80 }, end: { x: 50, y: 90 }, color: 'red' }]),
            instructions: JSON.stringify([{ time: 0, text: 'Salah to cut inside' }])
        }
    });

    // 9. Sessions (Training)
    const session = await prisma.session.create({
        data: {
            title: 'High Intensity Pressing Drills',
            date: new Date(),
            organizationId: org.id,
            coachId: coachProfileId,
            teamId: team.id,
            type: 'TACTICAL' as SessionType,
            duration: 90,
            intensity: 8,
            status: 'COMPLETED' as SessionStatus,
            venue: 'Academy Training Pitch 1',
            notes: 'Focus on triggering the press upon loss of possession.',
            participants: {
                create: playerRecords.map(p => ({
                    playerId: p.id,
                    attendanceStatus: 'PRESENT' as AttendanceStatus
                }))
            }
        }
    });

    // 10. Match & Match Result
    const match = await prisma.match.create({
        data: {
            teamId: team.id,
            opponent: 'Manchester Reds',
            competition: 'LEAGUE' as CompetitionType,
            venue: 'Home Stadium',
            matchDate: new Date(new Date().setDate(new Date().getDate() - 2)), // 2 days ago
            result: {
                create: {
                    homeScore: 3,
                    awayScore: 1,
                    details: 'Dominant home performance. Good pressing.',
                    scorers: {
                        create: [
                            { playerId: playerRecords[8].id, playerName: 'Mohamed Salah', minute: '14', isHomeTeam: true },
                            { playerId: playerRecords[9].id, playerName: 'Darwin Nunez', minute: '35', isHomeTeam: true },
                            { playerName: 'Marcus R.', minute: '60', isHomeTeam: false },
                            { playerId: playerRecords[8].id, playerName: 'Mohamed Salah', minute: '89', isHomeTeam: true }
                        ]
                    }
                }
            }
        }
    });
    console.log('✅ Match and Sessions synced');

    // 11. Media / Video
    const video = await prisma.video.create({
        data: {
            storagePath: 'https://sample-videos.com/video123.mp4',
            originalName: 'vs_manchester_reds_full.mp4',
            type: 'MATCH' as VideoType,
            status: 'COMPLETED' as VideoStatus,
            durationSec: 5400, // 90 mins
            fps: 60,
            width: 1920,
            height: 1080,
            organizationId: org.id,
            matchId: match.id,
            clips: {
                create: [
                    {
                        organizationId: org.id,
                        playerId: playerRecords[8].id,
                        startSec: 840, // 14 mins
                        endSec: 860,
                        label: 'Salah Opening Goal',
                        tags: ['Goal', 'Cut Inside', 'Finishing'],
                        createdBy: 'MANUAL' as ClipSource
                    }
                ]
            }
        }
    });

    // 12. Analysis & Metrics
    await prisma.matchAnalysis.create({
        data: {
            title: 'vs Manchester Reds - Tactical Review',
            date: new Date(),
            matchId: match.id,
            homeTeam: team.name,
            awayTeam: 'Manchester Reds',
            videoId: video.id,
            inputMode: 'manual',
            organizationId: org.id,
            matchStats: JSON.stringify({ possession: 65, shotsOnTarget: 8, passes: 540 }),
            matchEvents: JSON.stringify([{ minute: 14, type: 'Goal', player: 'Salah' }])
        }
    });

    await prisma.playerAnalysis.create({
        data: {
            title: 'Salah Positioning Analysis',
            date: new Date(),
            playerId: playerRecords[8].id,
            organizationId: org.id,
            videoId: video.id,
            analysisData: JSON.stringify({ heatmapPath: '/heatmaps/salah_1.png', distancesCovered: 10.5 })
        }
    });

    // Player metrics
    await prisma.metric.createMany({
        data: [
            { type: 'Top Speed (km/h)', value: 34.2, playerId: playerRecords[9].id },
            { type: 'Pass Completion (%)', value: 92.5, playerId: playerRecords[5].id },
            { type: 'Distance Covered (km)', value: 11.2, playerId: playerRecords[6].id },
        ]
    });

    // 13. Todos
    await prisma.todo.create({
        data: {
            text: 'Review tactical board with defensive line',
            userId: coachUser.id,
            done: false,
            matchId: match.id
        }
    });

    console.log('✅ Demo Seed completed successfully 🚀');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
