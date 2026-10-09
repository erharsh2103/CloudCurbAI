// All money in the app is stored and displayed in Indian rupees.
export function formatInr(value: number, maximumFractionDigits = 0) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits })}`;
}

// Short form for headline figures: ₹8.42L, ₹1.86Cr, ₹46,200.
export function formatInrCompact(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 10_000_000) return `${sign}₹${(absolute / 10_000_000).toFixed(2)}Cr`;
  if (absolute >= 100_000) return `${sign}₹${(absolute / 100_000).toFixed(2)}L`;
  return `${sign}₹${Math.round(absolute).toLocaleString("en-IN")}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("en-IN", { maximumFractionDigits });
}
