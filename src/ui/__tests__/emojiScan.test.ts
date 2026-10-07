/**
 * Emoji Scan Test — Section 1.4:
 * "No emojis anywhere in the UI: remove them from screen titles and section headers too...
 * Add a test that scans app/ and src/ui/ for emoji characters in source strings and fails if any are found.
 * Parser keyword lists and user data are exempt."
 */

import fs from 'fs';
import path from 'path';

// Standard Unicode emoji regex (pictographs, emoticons, symbols)
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Emoji Scan: Zero Emojis in app/ and src/ui/', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  function collectSourceFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
          results.push(...collectSourceFiles(fullPath));
        }
      } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  test('no file in app/ or src/ui/ contains emoji characters', () => {
    const files = [
      ...collectSourceFiles(path.join(rootDir, 'app')),
      ...collectSourceFiles(path.join(rootDir, 'src/ui')),
    ];

    const violations: { file: string; line: number; content: string }[] = [];

    for (const file of files) {
      const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
      const lines = fs.readFileSync(file, 'utf8').split('\n');

      lines.forEach((line, idx) => {
        if (EMOJI_REGEX.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            content: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error(`Found ${violations.length} emoji violations in UI files:`);
      violations.forEach((v) => {
        console.error(`  - ${v.file}:${v.line} -> ${v.content}`);
      });
    }

    expect(violations).toEqual([]);
  });
});
