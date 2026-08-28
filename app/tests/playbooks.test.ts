import { describe, expect, it } from 'vitest';
import {
  mapPlaybookSearchRow,
  toStringList,
} from '../server/agent/tools/playbooks.js';

describe('playbook search result mapping', () => {
  it('maps pg JSON and numeric values to agent-safe primitives', () => {
    expect(
      mapPlaybookSearchRow({
        guide_id: 'acf-tanf-income-identity',
        title: 'TANF verification',
        agency: 'HHS ACF',
        program: 'TANF',
        scenario: 'income mismatch',
        summary: 'Resolve the discrepancy.',
        verification_steps: '["confirm identity","verify wages"]',
        required_documents: ['identity evidence', 'wage statement'],
        hold_guidance: 'Use the shortest authorized review window.',
        authority_citation: '45 C.F.R. Part 205',
        source_url: 'https://www.acf.hhs.gov/ofa/programs/tanf',
        score: '0.875',
      }),
    ).toMatchObject({
      verification_steps: ['confirm identity', 'verify wages'],
      required_documents: ['identity evidence', 'wage statement'],
      score: 0.875,
    });
  });

  it('drops malformed and non-string list values', () => {
    expect(toStringList('not json')).toEqual([]);
    expect(toStringList(['valid', 7, null])).toEqual(['valid']);
    expect(toStringList(null)).toEqual([]);
  });
});
