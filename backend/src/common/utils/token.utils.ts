export function composeRefreshComposite(id: string, raw: string): string {
  return `${id}.${raw}`;
}

export function parseRefreshComposite(composite: string): {
  id: string;
  raw: string;
} {
  if (!composite) {
    throw new Error('No composite token provided');
  }

  const [id, raw] = composite.split('.');

  if (!id || !raw) {
    throw new Error('Malformed composite token');
  }

  return { id, raw };
}
