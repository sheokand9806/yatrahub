import { useEffect } from 'react';

// Indian Rupees with Indian digit grouping, e.g. 2499900 -> "₹24,99,900"
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});
export const formatINR = amount => inr.format(Number(amount) || 0);

export const formatMonthYear = date =>
  date
    ? new Date(date).toLocaleString('en-us', { month: 'long', year: 'numeric' })
    : 'To be announced';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `YatraHub | ${title}` : 'YatraHub';
  }, [title]);
}

export const formatDate = d =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

export const formatDateTime = d =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : '-';

// Downloads rows (array of arrays) as a CSV file
export function downloadCSV(filename, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
