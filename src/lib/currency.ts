export function getCurrencySymbol(currency = "CAD") {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0)

  return parts.find((part) => part.type === "currency")?.value ?? currency
}
