// File: prisma/seed.ts
// Version: v0.6.4 – Fix casing, BigInt raceId, and JLL horse fun

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing old data...');

  // Respect FK constraints: clear in the correct order
  await prisma.result.deleteMany();
  await prisma.race.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.horse.deleteMany();

  console.log('🐎 Seeding branded horses...');

  const redHorse = await prisma.horse.create({
    data: { name: 'Leaseloon Lightning', color: 'red' }
  });
  const blueHorse = await prisma.horse.create({
    data: { name: 'Commission Crusher', color: 'blue' }
  });
  const greenHorse = await prisma.horse.create({
    data: { name: 'Slack Galloper', color: 'green' }
  });

  await prisma.horse.createMany({
    data: [
      { name: 'Elevator Pitcher', color: 'yellow' },
      { name: 'Tour Sheet Trotter', color: 'purple' },
      { name: 'Amenity Stampeder', color: 'orange' },
      { name: 'Broker Blitz', color: 'pink' },
      { name: 'Hot Desk Rocket', color: 'gray' },
      { name: 'Sublease Sprinter', color: 'teal' },
      { name: 'Cap Rate Comet', color: 'navy' },
      { name: 'Buildout Bandit', color: 'lime' },
      { name: 'SpaceIQ Speedster', color: 'cyan' },
      { name: 'CoreNet Cruiser', color: 'maroon' },
      { name: 'Amenity Arms Racer', color: 'olive' },
      { name: 'Lease-Up Lightning', color: 'beige' },
      { name: 'JLL Jockey Jet', color: 'white' },
      { name: 'Stack Plan Slammer', color: 'indigo' },
      { name: 'Fitwel Flyer', color: 'aqua' },
      { name: 'Wayfinding Wonder', color: 'tan' },
      { name: 'Occupier Outlaw', color: 'charcoal' },
      { name: 'PropTech Prancer', color: 'silver' }
    ]
  });

  console.log('🙋‍♂️ Creating test users...');

  const colin = await prisma.user.create({
    data: { firstName: 'Colin', lastName: 'DiBiase', nickname: 'CD', deviceId: 'device_cd' }
  });
  const jamie = await prisma.user.create({
    data: { firstName: 'Jamie', lastName: 'Leasewell', nickname: 'JL', deviceId: 'device_jl' }
  });
  const riley = await prisma.user.create({
    data: { firstName: 'Riley', lastName: 'Spacefinder', nickname: 'RS', deviceId: 'device_rs' }
  });

  console.log('📝 Registering users to horses...');

  await prisma.registration.createMany({
    data: [
      { userId: colin.id, horseId: redHorse.id },
      { userId: jamie.id, horseId: blueHorse.id },
      { userId: riley.id, horseId: greenHorse.id }
    ]
  });

  console.log('🏁 Creating race and storing results...');

  const race = await prisma.race.create({
    data: {
      startedAt: new Date(),
      endedAt: new Date()
    }
  });

  await prisma.result.createMany({
    data: [
      {
        raceId: BigInt(race.id), // 🧠 Cast raceId for BigInt safety
        horseId: redHorse.id,
        position: 1,
        timeMs: 10234
      },
      {
        raceId: BigInt(race.id),
        horseId: blueHorse.id,
        position: 2,
        timeMs: 10500
      },
      {
        raceId: BigInt(race.id),
        horseId: greenHorse.id,
        position: 3,
        timeMs: 11012
      }
    ]
  });

  console.log('✅ Seeded database successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
