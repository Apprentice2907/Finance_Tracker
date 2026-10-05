import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../../db/adapter';
import { Repository } from '../../db/repository';
import { nightColors, pocketColors, categoryColors } from '../tokens';

describe('Design Spec Phase D1: Tokens & Theme System', () => {
  let SQL: SqlJsStatic;
  let rawDb: any;
  let adapter: SqlJsDatabaseAdapter;
  let repo: Repository;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    rawDb = new SQL.Database();
    adapter = new SqlJsDatabaseAdapter(rawDb);
    repo = new Repository(adapter);
    await repo.init();
  });

  afterEach(async () => {
    await adapter.closeAsync();
  });

  test('Night tokens strictly match WINI_DESIGN_SPEC Section 3.1', () => {
    expect(nightColors.bg).toBe('#0B0B0D');
    expect(nightColors.surface).toBe('#151517');
    expect(nightColors.surface2).toBe('#1E1E21');
    expect(nightColors.accent).toBe('#F2F96E'); // Lime-yellow accent
    expect(nightColors.onAccent).toBe('#0B0B0D');
    expect(nightColors.income).toBe('#7CF2A0');
    expect(nightColors.expense).toBe('#FF6B7A');
    expect(nightColors.danger).toBe('#FF5A5F');
    expect(nightColors.chartTrack).toBe('#2A2A2E');
    expect(nightColors.border).toBe('rgba(255,255,255,0.08)');
  });

  test('Pocket tokens strictly match WINI_DESIGN_SPEC Section 3.2', () => {
    expect(pocketColors.bg).toBe('#F3F4F7');
    expect(pocketColors.surface).toBe('#FFFFFF');
    expect(pocketColors.surface2).toBe('#F6F7FA');
    expect(pocketColors.accent).toBe('#2B5BE8'); // Blue accent
    expect(pocketColors.onAccent).toBe('#FFFFFF');
    expect(pocketColors.income).toBe('#12B76A');
    expect(pocketColors.expense).toBe('#E5484D');
    expect(pocketColors.danger).toBe('#E5484D');
    expect(pocketColors.chartLine).toBe('#3B6CF5');
    expect(pocketColors.paper).toBe('#FBF7EE');
    expect(pocketColors.paperLine).toBe('#E9E1CF');
  });

  test('Category colors define all 12 spec colors with exact hex values', () => {
    expect(categoryColors.yellow).toBe('#FFC83D');
    expect(categoryColors.mint).toBe('#2EE6A6');
    expect(categoryColors.violet).toBe('#7A5CFA');
    expect(categoryColors.magenta).toBe('#E5338A');
    expect(categoryColors.blue).toBe('#2F6BFF');
    expect(categoryColors.cyan).toBe('#35D0F2');
    expect(categoryColors.orange).toBe('#FF8A3D');
    expect(categoryColors.lime).toBe('#B8E04A');
    expect(categoryColors.pink).toBe('#FF8FD0');
    expect(categoryColors.coral).toBe('#FF6B6B');
    expect(categoryColors.teal).toBe('#1FB6A6');
    expect(categoryColors.grey).toBe('#8E8E93');
  });

  test('theme_mode setting persists and reads from database repository', async () => {
    // Default is 'system'
    const defaultMode = await repo.getSetting('theme_mode', 'system');
    expect(defaultMode).toBe('system');

    // Switch to Night
    await repo.setSetting('theme_mode', 'night');
    expect(await repo.getSetting('theme_mode')).toBe('night');

    // Switch to Pocket
    await repo.setSetting('theme_mode', 'pocket');
    expect(await repo.getSetting('theme_mode')).toBe('pocket');
  });
});
