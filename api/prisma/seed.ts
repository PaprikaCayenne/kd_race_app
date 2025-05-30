// File: prisma/seed.ts
// Version: v1.0.0 — Production-safe seed with only horses and race names
// Date: 2025-05-29

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BODY_COLORS = [
  { name: 'bay', hex: '#8B4513' },
  { name: 'chestnut', hex: '#954535' },
  { name: 'palomino', hex: '#EEE8AA' },
  { name: 'black', hex: '#111111' },
  { name: 'white', hex: '#FAFAFA' },
  { name: 'gray', hex: '#B0B0B0' },
  { name: 'buckskin', hex: '#DAA520' },
  { name: 'roan', hex: '#B76E79' }
];

const SADDLES = [
  { name: 'red', hex: '#E53935' },
  { name: 'blue', hex: '#1E88E5' },
  { name: 'green', hex: '#43A047' },
  { name: 'yellow', hex: '#FDD835' },
  { name: 'purple', hex: '#8E24AA' },
  { name: 'orange', hex: '#FB8C00' },
  { name: 'pink', hex: '#F06292' },
  { name: 'gray', hex: '#757575' },
  { name: 'teal', hex: '#00897B' },
  { name: 'navy', hex: '#303F9F' },
  { name: 'lime', hex: '#C0CA33' },
  { name: 'cyan', hex: '#00ACC1' },
  { name: 'maroon', hex: '#6A1B9A' },
  { name: 'olive', hex: '#827717' },
  { name: 'beige', hex: '#F5F5DC' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'indigo', hex: '#3949AB' },
  { name: 'aqua', hex: '#4DD0E1' },
  { name: 'tan', hex: '#D2B48C' },
  { name: 'charcoal', hex: '#444444' },
  { name: 'silver', hex: '#C0C0C0' }
];

const HORSE_NAMES = [
  'Leaseloon Lightning', 'Commission Crusher', 'Slack Galloper',
  'Elevator Pitcher', 'Tour Sheet Trotter', 'Amenity Stampeder',
  'Broker Blitz', 'Hot Desk Rocket', 'Sublease Sprinter',
  'Cap Rate Comet', 'Buildout Bandit', 'SpaceIQ Speedster',
  'CoreNet Cruiser', 'Amenity Arms Racer', 'Lease-Up Lightning',
  'JLL Jockey Jet', 'Stack Plan Slammer', 'Fitwel Flyer',
  'Wayfinding Wonder', 'Occupier Outlaw', 'PropTech Prancer'
];

const RACE_NAMES = [
  "Lease Legends", "The Amenity Stakes", "Sublease Sprint", "Commission Clash",
  "Hot Desk Derby", "CoreNet Cup", "Jockey Jam","Broker Bash", "The Stack Stampede", "Fitwel 400", "Wayfinding Whirl",
  "Occupier Open", "Cap Rate Cup", "Tour Sheet Trial", "Pitch Parade",
  "PropTech Pace", "Amenity Arms Invitational", "JLL Showdown", "Deskless Dash"
];

async function main() {
  console.log('🧹 Clearing old data...');
  await prisma.replayFrame.deleteMany();
  await prisma.horsePath.deleteMany();
  await prisma.trackMeta.deleteMany();
  await prisma.result.deleteMany();
  await prisma.race.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.raceName.deleteMany();

  console.log('🐎 Seeding horses...');
  const horseData = HORSE_NAMES.map((name, i) => {
    const saddle = SADDLES[i];
    const body = BODY_COLORS[i % BODY_COLORS.length];
    return {
      name,
      saddleColor: saddle.name,
      saddleHex: saddle.hex,
      bodyColor: body.name,
      bodyHex: body.hex
    };
  });

  await prisma.horse.createMany({ data: horseData });

  console.log('🏷️ Seeding race names...');
  await prisma.raceName.createMany({
    data: RACE_NAMES.map(name => ({ name }))
  });

  console.log('✅ Production seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
