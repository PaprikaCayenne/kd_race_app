// File: prisma/seed.ts
// Version: v0.6.7 — Seeds users with Lease Loons currency

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const VARIANTS = ['bay', 'chestnut', 'palomino', 'black'];

function getRandomVariant(): string {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}

async function main() {
  console.log('🧹 Clearing old data...');

  // Clear in correct FK order
  await prisma.replayFrame.deleteMany();
  await prisma.horsePath.deleteMany();
  await prisma.trackMeta.deleteMany();
  await prisma.result.deleteMany();
  await prisma.race.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.horse.deleteMany();

  console.log('🐎 Seeding horses...');

  const redHorse = await prisma.horse.create({
    data: {
      name: 'Leaseloon Lightning',
      color: 'red',
      variant: getRandomVariant()
    }
  });
  const blueHorse = await prisma.horse.create({
    data: {
      name: 'Commission Crusher',
      color: 'blue',
      variant: getRandomVariant()
    }
  });
  const greenHorse = await prisma.horse.create({
    data: {
      name: 'Slack Galloper',
      color: 'green',
      variant: getRandomVariant()
    }
  });

  await prisma.horse.createMany({
    data: [
      { name: 'Elevator Pitcher', color: 'yellow', variant: getRandomVariant() },
      { name: 'Tour Sheet Trotter', color: 'purple', variant: getRandomVariant() },
      { name: 'Amenity Stampeder', color: 'orange', variant: getRandomVariant() },
      { name: 'Broker Blitz', color: 'pink', variant: getRandomVariant() },
      { name: 'Hot Desk Rocket', color: 'gray', variant: getRandomVariant() },
      { name: 'Sublease Sprinter', color: 'teal', variant: getRandomVariant() },
      { name: 'Cap Rate Comet', color: 'navy', variant: getRandomVariant() },
      { name: 'Buildout Bandit', color: 'lime', variant: getRandomVariant() },
      { name: 'SpaceIQ Speedster', color: 'cyan', variant: getRandomVariant() },
      { name: 'CoreNet Cruiser', color: 'maroon', variant: getRandomVariant() },
      { name: 'Amenity Arms Racer', color: 'olive', variant: getRandomVariant() },
      { name: 'Lease-Up Lightning', color: 'beige', variant: getRandomVariant() },
      { name: 'JLL Jockey Jet', color: 'white', variant: getRandomVariant() },
      { name: 'Stack Plan Slammer', color: 'indigo', variant: getRandomVariant() },
      { name: 'Fitwel Flyer', color: 'aqua', variant: getRandomVariant() },
      { name: 'Wayfinding Wonder', color: 'tan', variant: getRandomVariant() },
      { name: 'Occupier Outlaw', color: 'charcoal', variant: getRandomVariant() },
      { name: 'PropTech Prancer', color: 'silver', variant: getRandomVariant() }
    ]
  });

  console.log('🙋‍♂️ Creating test users with Lease Loons...');

  const colin = await prisma.user.create({
    data: {
      firstName: 'Colin',
      lastName: 'DiBiase',
      nickname: 'CD',
      deviceId: 'device_cd',
      currency: 1000 // 🪙 Lease Loons
    }
  });
  const jamie = await prisma.user.create({
    data: {
      firstName: 'Jamie',
      lastName: 'Leasewell',
      nickname: 'JL',
      deviceId: 'device_jl',
      currency: 1000
    }
  });
  const riley = await prisma.user.create({
    data: {
      firstName: 'Riley',
      lastName: 'Spacefinder',
      nickname: 'RS',
      deviceId: 'device_rs',
      currency: 1000
    }
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
