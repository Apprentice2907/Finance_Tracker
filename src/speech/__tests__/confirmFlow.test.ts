import initSqlJs, { SqlJsStatic } from 'sql.js';
import { SqlJsDatabaseAdapter } from '../../db/adapter';
import { Repository } from '../../db/repository';
import { FakeSpeechService } from '../FakeSpeechService';
import { parseUtterance } from '../../parser/parseUtterance';

describe('Confirm Flow Logic Tests (Phase 3)', () => {
  let SQL: SqlJsStatic;
  let db: any;
  let adapter: SqlJsDatabaseAdapter;
  let repo: Repository;
  let speechService: FakeSpeechService;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    db = new SQL.Database();
    adapter = new SqlJsDatabaseAdapter(db);
    repo = new Repository(adapter);
    await repo.init();
    speechService = new FakeSpeechService();
  });

  afterEach(async () => {
    await adapter.closeAsync();
  });

  test('low-confidence routing: garbage input flags for edit form routing', () => {
    const parsed = parseUtterance('asdf qwerty 1234 gibberish');
    // Amount could not be reliably resolved to a valid expense or confidence is low
    const shouldRouteToEdit = parsed.confidence < 0.7 || parsed.category === null;
    expect(shouldRouteToEdit).toBe(true);
    // Even if routing to edit, it never throws and provides pre-filled values
    expect(parsed.note).toBeDefined();
    expect(parsed.date).toBeDefined();
  });

  test('high-confidence speech input extracts and saves directly to repository', async () => {
    let capturedTranscript = '';
    await speechService.startListening({
      onFinalTranscript: (text) => {
        capturedTranscript = text;
      },
    });

    speechService.emitFinalTranscript('add 10 rupees rickshaw');
    expect(capturedTranscript).toBe('add 10 rupees rickshaw');

    const parsed = parseUtterance(capturedTranscript);
    expect(parsed.amountPaise).toBe(1000);
    expect(parsed.category).toBe('Transport');

    const transportCat = await repo.getCategoryByName('Transport');
    expect(transportCat).not.toBeNull();

    const tx = await repo.addTransaction({
      type: parsed.type,
      amount_paise: parsed.amountPaise!,
      category_id: transportCat!.id,
      note: parsed.note,
      occurred_on: parsed.date,
      source: 'voice',
      raw_text: capturedTranscript,
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount_paise).toBe(1000);
    expect(tx.source).toBe('voice');
    expect(tx.raw_text).toBe('add 10 rupees rickshaw');
  });

  test('learned keyword saving when category is selected for unknown word', async () => {
    // 1. Initial parse with unknown word "chole bhature"
    const parsedInitial = parseUtterance('120 chole bhature');
    expect(parsedInitial.amountPaise).toBe(12000);
    expect(parsedInitial.category).toBeNull(); // Unknown initially
    expect(parsedInitial.confidence).toBeLessThan(0.9);

    // 2. User confirms Food on confirm sheet
    const foodCat = await repo.getCategoryByName('Food');
    expect(foodCat).not.toBeNull();

    // Store learned keyword
    const wordToLearn = parsedInitial.note.toLowerCase();
    await repo.setKeyword(wordToLearn, foodCat!.id);

    // 3. Re-query keywords from DB into memory map
    const learnedKeywords = await repo.getKeywords();
    const keywordMap: Record<string, string> = {};
    for (const kw of learnedKeywords) {
      keywordMap[kw.word] = 'Food';
    }

    // 4. Next time user says the same word, parser resolves it with high confidence!
    const parsedNext = parseUtterance('150 chole bhature', new Date(), 'Asia/Kolkata', keywordMap);
    expect(parsedNext.amountPaise).toBe(15000);
    expect(parsedNext.category).toBe('Food');
    expect(parsedNext.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('amount edits during confirm sheet flow', async () => {
    const parsed = parseUtterance('50 chai');
    expect(parsed.amountPaise).toBe(5000);

    // User edits amount from 50 to 60 (6000 paise) before saving
    const userEditedAmountPaise = 6000;
    const foodCat = await repo.getCategoryByName('Food');

    const tx = await repo.addTransaction({
      type: parsed.type,
      amount_paise: userEditedAmountPaise,
      category_id: foodCat!.id,
      note: parsed.note,
      occurred_on: parsed.date,
      source: 'voice',
      raw_text: '50 chai',
    });

    expect(tx.amount_paise).toBe(6000);
  });

  test('permission denial emits friendly message offering typing', async () => {
    speechService.permissionGranted = false;
    let receivedError = '';
    let receivedCode = '';

    await speechService.startListening({
      onError: (msg, code) => {
        receivedError = msg;
        receivedCode = code;
      },
    });

    expect(receivedCode).toBe('not-allowed');
    expect(receivedError).toContain("Type instead");
  });
});
