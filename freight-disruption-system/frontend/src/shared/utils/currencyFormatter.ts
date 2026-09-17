// frontend/src/shared/utils/currencyFormatter.ts
/**
 * Dual Currency Formatter Utility
 * Supports US Dollar ($ USD) and Indian Rupee (₹ INR in Lakhs/Crores notation)
 */

export const USD_TO_INR = 83.50; // Current benchmark commercial freight exchange rate

/**
 * Formats a USD numeric value into standard US currency string
 * Example: 154000 -> "$154,000"
 */
export const formatUSD = (usd: number): string => {
  if (isNaN(usd) || usd === null || usd === undefined) return '$0';
  const sign = usd < 0 ? '-' : '';
  const absVal = Math.abs(usd);
  return `${sign}$${Math.round(absVal).toLocaleString('en-US')}`;
};

/**
 * Formats an amount into standard Indian Rupee notation (Lakhs and Crores)
 * Example: 12,859,000 -> "₹1.29 Cr"
 * Example: 450,000 -> "₹4.50 L"
 * Example: 25,000 -> "₹25,000"
 */
export const formatINR = (inr: number): string => {
  if (isNaN(inr) || inr === null || inr === undefined) return '₹0';
  const sign = inr < 0 ? '-' : '';
  const absVal = Math.abs(inr);

  if (absVal >= 10_000_000) {
    return `${sign}₹${(absVal / 10_000_000).toFixed(2)} Cr`;
  } else if (absVal >= 100_000) {
    return `${sign}₹${(absVal / 100_000).toFixed(2)} L`;
  } else {
    return `${sign}₹${Math.round(absVal).toLocaleString('en-IN')}`;
  }
};

/**
 * Converts a USD value to INR and formats it
 */
export const usdToFormattedINR = (usd: number): string => {
  return formatINR(usd * USD_TO_INR);
};

/**
 * Returns a combined dual-currency string
 * Example: 154000 -> "$154,000 (₹1.29 Cr)"
 */
export const formatDualCurrency = (usd: number): string => {
  return `${formatUSD(usd)} (${usdToFormattedINR(usd)})`;
};

/**
 * Returns dual currency components for split rendering
 */
export const getDualCurrencyParts = (usd: number) => {
  return {
    usd: formatUSD(usd),
    inr: usdToFormattedINR(usd),
    combined: formatDualCurrency(usd),
  };
};
