import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 🧹 Clear existing data in the correct order (respecting FK constraints)
  await prisma.result.deleteMany();
  await prisma.race.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.horse.deleteMany();

  // 🐎 Seed a few horses and store references to use their IDs later
  const redHorse = await prisma.horse.create({ data: { name: 'Leaseloon Lightning', color: 'red' } });
  const blueHorse = await prisma.horse.create({ data: { name: 'Commission Crusher', color: 'blue' } });
  const greenHorse = await prisma.horse.create({ data: { name: 'Slack Galloper', color: 'green' } });

  // 🐴 Add more horses using createMany (IDs not needed here)
  await prisma.horse.createMany({
    data: [
      { name: 'Elevator Pitcher', color: 'yellow' },
      { name: 'Tour Sheet Trotter', color: 'purple' },
      { name: 'Amenity Stampeder', color: 'orange' },
      { name: 'Broker Blitz', color: 'pink' },
      { name: 'Hot Desk Rocket', color: 'gray' }
    ]
  });

  // 🙋‍♂️ Create test users with unique deviceIds
  const colin = await prisma.user.create({
    data: { firstName: 'Colin', lastName: 'DiBiase', nickname: 'CD', deviceId: 'device_cd' }
  });
  const jamie = await prisma.user.create({
    data: { firstName: 'Jamie', lastName: 'Leasewell', nickname: 'JL', deviceId: 'device_jl' }
  });
  const riley = await prisma.user.create({
    data: { firstName: 'Riley', lastName: 'Spacefinder', nickname: 'RS', deviceId: 'device_rs' }
  });

  // 📝 Register each user with a horse using camelCase field names
  await prisma.registration.createMany({
    data: [
      { userId: colin.id, horseId: redHorse.id },
      { userId: jamie.id, horseId: blueHorse.id },
      { userId: riley.id, horseId: greenHorse.id }
    ]
  });

  // 🏁 Create a simulated race event
  const race = await prisma.race.create({
    data: {
      startedAt: new Date(),
      endedAt: new Date()
    }
  });

  // 🥇 Record race results for the top 3 finishers
  await prisma.result.createMany({
    data: [
      { raceId: race.id, horseId: redHorse.id, position: 1, timeMs: 10234 },
      { raceId: race.id, horseId: blueHorse.id, position: 2, timeMs: 10500 },
      { raceId: race.id, horseId: greenHorse.id, position: 3, timeMs: 11012 }
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
