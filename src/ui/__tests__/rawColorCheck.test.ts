import fs from 'fs';
import path from 'path';

describe('Design System Integrity: No Raw Hex Colors in Screen Files', () => {
  const APP_DIR = path.resolve(__dirname, '../../../app');
  // Match standard hex color formats: #fff, #ffffff, #ffffffff, #000, etc.
  const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

  function getFilesRecursively(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getFilesRecursively(fullPath));
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  test('no screen file in app/ contains raw hex colors (#xxxxxx)', () => {
    const files = getFilesRecursively(APP_DIR);
    expect(files.length).toBeGreaterThan(0);

    const violations: { file: string; line: number; content: string }[] = [];

    for (const file of files) {
      const relPath = path.relative(APP_DIR, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf8');
      const lines: string[] = content.split('\n');

      lines.forEach((lineText: string, idx: number) => {
        // Allow comment notes mentioning hex format if any, but enforce no raw hex in code
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
          return;
        }

        if (HEX_COLOR_REGEX.test(lineText)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            content: lineText.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      console.error('Found raw hex color violations in app/ screen files:');
      violations.forEach((v) => {
        console.error(`  - ${v.file}:${v.line} -> ${v.content}`);
      });
    }

    expect(violations).toEqual([]);
  });

  test('color detection regex correctly identifies raw hex strings', () => {
    expect(HEX_COLOR_REGEX.test("color: '#FFFFFF'")).toBe(true);
    expect(HEX_COLOR_REGEX.test('backgroundColor: "#0A0F1E"')).toBe(true);
    expect(HEX_COLOR_REGEX.test('shadowColor: "#000"')).toBe(true);
    expect(HEX_COLOR_REGEX.test('color: colors.white')).toBe(false);
    expect(HEX_COLOR_REGEX.test('backgroundColor: colors.primary')).toBe(false);
  });
});
