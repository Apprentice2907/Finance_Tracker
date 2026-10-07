import fs from 'fs';
import path from 'path';

describe('Home Screen Spec Verifications', () => {
  const homeFilePath = path.resolve(__dirname, '../../../app/index.tsx');
  const homeCode = fs.readFileSync(homeFilePath, 'utf-8');

  it('does NOT contain the removed quick action row buttons (Voice Add, Type Add, Income button)', () => {
    expect(homeCode).not.toContain('title="Voice Add"');
    expect(homeCode).not.toContain('title="Type Add"');
    expect(homeCode).not.toContain('title="Income"');
    expect(homeCode).not.toContain('title="Insights"');
  });

  it('includes HeroCard, BarChart, DonutChart, SectionHeader, and FloatingNav in Home structure', () => {
    expect(homeCode).toContain('<HeroCard');
    expect(homeCode).toContain('<BarChart');
    expect(homeCode).toContain('<DonutChart');
    expect(homeCode).toContain('<SectionHeader');
    expect(homeCode).toContain('<FloatingNav');
  });

  it('uses a single shared SegmentedControl for Expenses and Income', () => {
    expect(homeCode).toContain('options={CASHFLOW_SEGMENTS}');
  });

  it('slices recent transactions to exactly 5 items', () => {
    expect(homeCode).toContain('.slice(0, 5)');
  });
});
