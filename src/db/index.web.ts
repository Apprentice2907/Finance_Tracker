/**
 * Web Database initialization entry point and singleton manager for Wini.
 * Where it fits: Loaded on Web platforms instead of `src/db/index.ts` via Metro's `.web.ts` extension.
 * This file has ZERO dependencies or imports on `expo-sqlite`.
 */

import initSqlJs from 'sql.js';
import { Repository } from './repository';
import { DatabaseAdapter, WebSqlJsDatabaseAdapter } from './adapter.web';

let repositoryInstance: Repository | null = null;
let adapterInstance: DatabaseAdapter | null = null;

const STORAGE_KEY = 'wini_web_sqlite_db';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function initDatabase(): Promise<Repository> {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  // 1. Initialize sql.js WebAssembly
  let wasmBinary: ArrayBuffer | undefined;
  if (typeof window !== 'undefined' && 'fetch' in window) {
    try {
      const res = await fetch('/sql-wasm.wasm');
      if (res.ok) {
        wasmBinary = await res.arrayBuffer();
      }
    } catch {
      // Fallback to CDN via locateFile below
    }
  }

  const SQL = await initSqlJs(
    wasmBinary
      ? { wasmBinary }
      : {
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/${file}`,
        }
  );

  // 2. Restore existing database from localStorage if present
  let initialBytes: Uint8Array | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        initialBytes = base64ToUint8Array(saved);
      } catch (err) {
        console.warn('Could not decode saved SQLite database from localStorage:', err);
      }
    }
  }

  const db = initialBytes ? new SQL.Database(initialBytes) : new SQL.Database();
  adapterInstance = new WebSqlJsDatabaseAdapter(db);
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
