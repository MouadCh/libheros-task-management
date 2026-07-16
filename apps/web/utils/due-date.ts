const ONE_HOUR_MS = 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDatetimeParts(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Parse datetime-local (or ISO) input into an ISO string. Returns null if invalid. */
export function toIsoDueDate(localValue: string): string | null {
  if (!localValue.trim()) {
    return null;
  }

  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return toLocalDatetimeParts(date);
}

/** Default create-form due date: local now + 1 hour, for datetime-local inputs. */
export function defaultDueDateLocalValue(from: Date = new Date()): string {
  return toLocalDatetimeParts(new Date(from.getTime() + ONE_HOUR_MS));
}
