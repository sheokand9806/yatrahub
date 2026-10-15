// Indian Rupees with Indian digit grouping, e.g. 2499900 -> "₹24,99,900"
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});
exports.formatINR = amount => inr.format(Number(amount) || 0);
