// Export data to CSV
export function exportCSV(data, filename, columns) {
  if (!data.length) return alert('Tidak ada data untuk di-export');

  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export data to simple HTML table for print/PDF
export function exportPDF(data, title, columns) {
  if (!data.length) return alert('Tidak ada data untuk di-export');

  const headerCells = columns.map(c => `<th style="border:1px solid #333;padding:6px 10px;background:#f0f0f0;font-size:11px;text-align:left">${c.label}</th>`).join('');
  const rows = data.map(row => {
    const cells = columns.map(c => {
      const val = typeof c.key === 'function' ? c.key(row) : (row[c.key] ?? '-');
      return `<td style="border:1px solid #ccc;padding:5px 10px;font-size:11px">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { font-size: 12px; color: #666; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { margin: 10px; } }
</style>
</head><body>
<h1>🌿 Bestari FertCheck — ${title}</h1>
<p>Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top:16px;font-size:10px;color:#999">Total: ${data.length} data</p>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
