import { resolveApplicationDeposit } from './propertyDeposit'

/**
 * Deposit the student should pay (listing amount from property).
 */
export function resolvedStudentDepositAmount(app) {
  return resolveApplicationDeposit(app)
}

export { resolveApplicationDeposit } from './propertyDeposit'
