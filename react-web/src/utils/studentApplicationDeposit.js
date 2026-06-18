/**
 * Deposit the student should pay: landlord-entered amount on acceptance when present,
 * otherwise {@code depositAmountSuggested} from the API (rent-based prototype).
 */
export function resolvedStudentDepositAmount(app) {
  if (!app) return null
  const landlord = app.landlordDepositAmount ?? app.landlord_deposit_amount
  if (landlord != null && Number.isFinite(Number(landlord)) && Number(landlord) > 0) {
    return Number(landlord)
  }
  const suggested = app.depositAmountSuggested
  if (suggested != null && Number.isFinite(Number(suggested))) return Number(suggested)
  return null
}
