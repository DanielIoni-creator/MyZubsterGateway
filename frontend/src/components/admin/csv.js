// Lightweight CSV export helper for the Admin Dashboard.
// Generates a client-side CSV download with no extra dependency.

export function downloadCSV(filename, headers, rows) {
  const escape = (val) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [headers.map(escape).join(',')];
  rows.forEach((row) => {
    lines.push(row.map(escape).join(','));
  });

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}