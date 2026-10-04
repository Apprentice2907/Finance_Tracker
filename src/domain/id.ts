let nodeCrypto: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodeCrypto = require('crypto');
} catch {
  // Ignored in React Native runtime
}

let expoCrypto: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoCrypto = require('expo-crypto');
} catch {
  // Ignored in Node runtime
}

export function generateId(): string {
  if (expoCrypto?.randomUUID) {
    return expoCrypto.randomUUID();
  }
  if (nodeCrypto?.randomUUID) {
    return nodeCrypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
