/**
 * Clean and robust CSV parsing utility
 * Handles quotes, commas inside quotes, escaped double quotes, and CRLF row separators.
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Accidental or escaped double quotes: "" inside quotes becomes "
        currentValue += '"';
        i++;
      } else {
        // Toggle quote flag
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip standard Windows CR+LF pairing
      }
      row.push(currentValue.trim());
      result.push(row);
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Handle remaining text
  if (currentValue || row.length > 0) {
    row.push(currentValue.trim());
    result.push(row);
  }

  // Filter out empty rows of padding
  return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
}

/**
 * Converts spreadsheet rows (from parsed CSV) to styled objects with key-value mappings
 */
export function rowsToObjects(rawRows: string[][]): Record<string, string>[] {
  if (rawRows.length < 2) return [];
  
  const headers = rawRows[0].map(h => h.trim()).filter(h => h !== '');
  const dataRows = rawRows.slice(1);

  return dataRows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      // Handle rows that might have fewer values than headers
      obj[header] = row[index] !== undefined ? row[index] : '';
    });
    return obj;
  });
}
