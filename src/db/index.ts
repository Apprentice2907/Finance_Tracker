/**
 * Database initialization entry point and singleton manager for Wini.
 * Where it fits: Called on app startup in `app/_layout.tsx` to open `wini.db` and
 * run migrations, providing `getRepository()` for the rest of the application.
 *
 * Beginner note: What is a "Singleton"? Opening a SQLite file multiple times can
 * cause file locks and memory waste. A singleton keeps a single shared connection
 * instance alive and hands it out whenever `getRepository()` is called.
 */

import { Repository } from './repository';
import { DatabaseAdapter, ExpoDatabaseAdapter } from './adapter';

let repositoryInstance: Repository | null = null;
let adapterInstance: DatabaseAdapter | null = null;

export async function initDatabase(): Promise<Repository> {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  // Dynamic import of expo-sqlite for device runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require('expo-sqlite');
  const expoDb = await SQLite.openDatabaseAsync('wini.db');
  adapterInstance = new ExpoDatabaseAdapter(expoDb);
  repositoryInstance = new Repository(adapterInstance);
  await repositoryInstance.init();
  return repositoryInstance;
}

export function getRepository(): Repository {
  if (!repositoryInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return repositoryInstance;
}

export function setRepositoryForTest(repo: Repository): void {
  repositoryInstance = repo;
}
