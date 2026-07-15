import { describe, expect, it } from 'bun:test';
import { toDatetimeLocalValue, toIsoDueDate } from './due-date';

describe('toIsoDueDate', () => {
  it('returns null for empty or invalid values', () => {
    expect(toIsoDueDate('')).toBeNull();
    expect(toIsoDueDate('not-a-date')).toBeNull();
  });

  it('returns an ISO string for valid local datetime', () => {
    const iso = toIsoDueDate('2026-06-15T10:30');
    expect(iso).not.toBeNull();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('toDatetimeLocalValue', () => {
  it('returns empty string for invalid iso', () => {
    expect(toDatetimeLocalValue('bad')).toBe('');
  });

  it('formats a valid iso timestamp for datetime-local', () => {
    const value = toDatetimeLocalValue('2026-06-15T10:30:00.000Z');
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
