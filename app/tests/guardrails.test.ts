import { describe, it, expect } from 'vitest';
import {
  detectQueryAllData,
  assertNotQueryAllData,
} from '../server/agent/guardrails.js';

describe('query-all-data guardrail', () => {
  const BLOCK = [
    'show me all payments',
    'dump the entire dispo_recs table',
    'select * from everything',
    'every record with no filter',
    'list all data',
    'give me everything',
    'return all records unrestricted',
  ];

  const ALLOW = [
    'why is PAY-0000202 flagged?',
    'all signals on PAY-0000202',
    'rank dispositions for PAY-0000827',
    'find similar cross-agency fraud cases',
    'hold PAY-0000202 for verification',
    'what if we release PAY-0000202 instead of holding?',
  ];

  it.each(BLOCK)('blocks broad-dump request: %s', (text) => {
    const d = detectQueryAllData(text);
    expect(d.blocked).toBe(true);
    expect(d.matched).toBeTruthy();
    expect(() => assertNotQueryAllData(text)).toThrowError(/^Guardrail:/);
  });

  it.each(ALLOW)('allows scoped request: %s', (text) => {
    const d = detectQueryAllData(text);
    expect(d.blocked).toBe(false);
    expect(() => assertNotQueryAllData(text)).not.toThrow();
  });
});
