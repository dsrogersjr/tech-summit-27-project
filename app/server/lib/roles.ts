export type UserRole = 'examiner' | 'supervisor';

/** Normalize identities before any authorization comparison. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/** Parse the comma-separated supervisor allowlist into normalized identities. */
export function parseSupervisorEmails(
  value: string | null | undefined,
): Set<string> {
  return new Set((value ?? '').split(',').map(normalizeEmail).filter(Boolean));
}

export function roleForEmail(
  email: string | null | undefined,
  supervisorEmails: string | null | undefined,
): UserRole {
  const normalized = normalizeEmail(email);
  return normalized && parseSupervisorEmails(supervisorEmails).has(normalized)
    ? 'supervisor'
    : 'examiner';
}

export function canExecuteCaseAction(role: UserRole): boolean {
  return role === 'supervisor';
}

export function assertCanExecuteCaseAction(
  email: string | null | undefined,
  supervisorEmails: string | null | undefined,
): void {
  const normalized = normalizeEmail(email);
  if (!canExecuteCaseAction(roleForEmail(normalized, supervisorEmails))) {
    throw new Error(
      `Authorization denied: ${normalized || 'unknown user'} has role "examiner". ` +
        'Only supervisors listed in SUPERVISOR_EMAILS may execute case actions; ' +
        'you may still investigate, search, rank, and draft a recommendation.',
    );
  }
}
