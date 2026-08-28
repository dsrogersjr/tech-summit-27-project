import { describe, expect, it } from 'vitest';
import {
  assertCanExecuteCaseAction,
  canExecuteCaseAction,
  normalizeEmail,
  parseSupervisorEmails,
  roleForEmail,
} from '../server/lib/roles.js';

describe('hybrid authorization roles', () => {
  it('normalizes identities and comma-separated allowlists', () => {
    expect(normalizeEmail('  Supervisor@Example.COM ')).toBe(
      'supervisor@example.com',
    );
    expect([
      ...parseSupervisorEmails(
        ' A@EXAMPLE.COM, b@example.com, ,a@example.com ',
      ),
    ]).toEqual(['a@example.com', 'b@example.com']);
  });

  it('assigns supervisor only on an exact normalized email match', () => {
    const allowlist = 'lead@example.com, SUPERVISOR@EXAMPLE.COM';
    expect(roleForEmail(' supervisor@example.com ', allowlist)).toBe(
      'supervisor',
    );
    expect(roleForEmail('visor@example.com', allowlist)).toBe('examiner');
    expect(roleForEmail('', allowlist)).toBe('examiner');
  });

  it('allows only supervisors to execute a case action', () => {
    expect(canExecuteCaseAction('supervisor')).toBe(true);
    expect(canExecuteCaseAction('examiner')).toBe(false);
    expect(() =>
      assertCanExecuteCaseAction('lead@example.com', 'lead@example.com'),
    ).not.toThrow();
    expect(() =>
      assertCanExecuteCaseAction('examiner@example.com', 'lead@example.com'),
    ).toThrowError(
      /Only supervisors listed in SUPERVISOR_EMAILS may execute case actions/,
    );
  });
});
