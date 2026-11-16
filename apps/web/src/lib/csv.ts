/** Quote one CSV field and neutralise spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  // A leading formula marker would execute when the file opens in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Build a CRLF CSV with a fixed column order; headers are never user-controlled. */
export function buildCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map(csvCell).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(','));
  return [header, ...body].join('\r\n') + '\r\n';
}
