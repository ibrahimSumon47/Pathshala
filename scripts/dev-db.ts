import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDatabase } from './seed.js';

/** Run a throwaway MongoDB on a fixed port for local development without Atlas. */
async function main(): Promise<void> {
  const mongo = await MongoMemoryServer.create({
    instance: { port: 27018, dbName: 'pathshala' },
  });

  process.env.MONGODB_URI = mongo.getUri();
  await seedDatabase();

  console.log(`Development MongoDB ready at ${mongo.getUri()}`);
  console.log('Use MONGODB_URI=mongodb://127.0.0.1:27018/pathshala for the web and API.');
  console.log('Press Ctrl+C to stop; data is discarded.');

  const stop = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
