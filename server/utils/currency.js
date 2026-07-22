'use strict';

/**
 * Currency metadata and formatting utility.
 */

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "CAD", symbol: "CA$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD ($) - Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "BRL", symbol: "R$", label: "BRL (R$) - Brazilian Real" },
  { code: "MXN", symbol: "MX$", label: "MXN ($) - Mexican Peso" },
  { code: "CHF", symbol: "CHF", label: "CHF - Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "SEK (kr) - Swedish Krona" },
  { code: "NZD", symbol: "NZ$", label: "NZD ($) - New Zealand Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD ($) - Singapore Dollar" },
  { code: "AED", symbol: "AED", label: "AED - UAE Dirham" },
  { code: "SAR", symbol: "SAR", label: "SAR - Saudi Riyal" },
  { code: "TND", symbol: "د.ت", label: "TND (د.ت) - Tunisian Dinar" },
  { code: "MAD", symbol: "د.م.", label: "MAD (د.م.) - Moroccan Dirham" },
  { code: "DZD", symbol: "د.ج", label: "DZD (د.ج) - Algerian Dinar" },
  { code: "EGP", symbol: "ج.م", label: "EGP (ج.م) - Egyptian Pound" },
  { code: "LYD", symbol: "ل.د", label: "LYD (ل.د) - Libyan Dinar" },
];

function getCurrencySymbol(code = "USD") {
  if (!code) return "$";
  const found = CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found ? found.symbol : code.toUpperCase();
}

function formatPrice(amount, code = "USD") {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "";
  const num = Number(amount);
  const symbol = getCurrencySymbol(code);
  if (/^[A-Z]{3}$/.test(symbol) || /[\u0600-\u06FF]/.test(symbol)) {
    return `${num} ${symbol}`;
  }
  return `${symbol}${num}`;
}


module.exports = {
  CURRENCIES,
  getCurrencySymbol,
  formatPrice,
};
