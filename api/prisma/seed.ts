// File: prisma/seed.ts
// Version: v0.6.5 – Updated to match new schema with HorsePath and TrackMeta

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing old data...');

  // Clear in correct FK order
  await prisma.replayFrame.deleteMany();
  await prisma.horsePath.deleteMany();
  await prisma.trackMeta.deleteMany();
  await prisma.result.deleteMany();
  await prisma.race.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.horse.deleteMany();

  console.log('🐎 Seeding horses...');

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

  console.log('🏁 Creating race (empty stub for now)...');
  await prisma.race.create({
    data: {}
  });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
