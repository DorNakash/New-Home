const formatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return formatter.format(isNaN(value) ? 0 : value);
}
