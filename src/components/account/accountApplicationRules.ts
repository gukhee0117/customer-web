export const isValidAccountLimit = (amount: number, available: number | null): boolean =>
  available != null && Number.isInteger(amount) && amount >= 1 && amount <= available

export const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status

export const isAmbiguousResponse = (error: unknown): boolean => {
  const status = httpStatus(error)
  return status == null || status >= 500
}
