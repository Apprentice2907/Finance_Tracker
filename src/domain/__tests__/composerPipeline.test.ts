import { processComposerInput } from '../composerPipeline';

describe('composerPipeline', () => {
  const fixedDate = new Date('2026-10-07T12:00:00.000Z');

  test('processes a standard typed expense input', () => {
    const result = processComposerInput({
      text: 'chai 20',
      source: 'typed',
      now: fixedDate,
    });

    expect(result.source).toBe('typed');
    expect(result.effectiveTranscript).toBe('chai 20');
    expect(result.parsed.amountPaise).toBe(2000);
    expect(result.parsed.category).toBe('Food');
    expect(result.parsed.type).toBe('expense');
  });

  test('processes a standard typed income input', () => {
    const result = processComposerInput({
      text: 'got 5000 salary',
      source: 'typed',
      now: fixedDate,
    });

    expect(result.source).toBe('typed');
    expect(result.parsed.amountPaise).toBe(500000);
    expect(result.parsed.category).toBe('Income');
    expect(result.parsed.type).toBe('income');
  });

  test('processes voice input with multi-alternatives and picks highest confidence candidate', () => {
    const result = processComposerInput({
      text: 'ten rickshaw',
      source: 'voice',
      alternatives: ['ten random word', 'add 10 rupees rickshaw'],
      now: fixedDate,
    });

    expect(result.source).toBe('voice');
    expect(result.effectiveTranscript).toBe('add 10 rupees rickshaw');
    expect(result.parsed.amountPaise).toBe(1000);
    expect(result.parsed.category).toBe('Transport');
    expect(result.parsed.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('applies custom learned keywords from keywordMap', () => {
    const result = processComposerInput({
      text: 'bought stationery 350',
      source: 'typed',
      now: fixedDate,
      keywordMap: { stationery: 'Shopping' },
    });

    expect(result.parsed.category).toBe('Shopping');
    expect(result.parsed.amountPaise).toBe(35000);
  });

  test('handles relative dates in Indian timezone', () => {
    const result = processComposerInput({
      text: 'kal 100 petrol',
      source: 'voice',
      now: fixedDate,
    });

    expect(result.parsed.amountPaise).toBe(10000);
    expect(result.parsed.category).toBe('Transport');
    expect(result.parsed.date).toBe('2026-10-06');
  });

  test('handles empty or whitespace inputs gracefully', () => {
    const result = processComposerInput({
      text: '   ',
      source: 'typed',
      now: fixedDate,
    });

    expect(result.parsed.amountPaise).toBeNull();
    expect(result.parsed.confidence).toBe(0);
  });

  test('handles trimmed whitespace in candidate alternatives', () => {
    const result = processComposerInput({
      text: 'swiggy 450',
      source: 'voice',
      alternatives: ['   ', ' swiggy 450 '],
      now: fixedDate,
    });

    expect(result.effectiveTranscript).toBe('swiggy 450');
    expect(result.parsed.amountPaise).toBe(45000);
    expect(result.parsed.category).toBe('Food');
  });
});
