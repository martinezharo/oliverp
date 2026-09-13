/**
 * A failed API call, carrying the machine-readable `code` from the error
 * envelope. The `message` stays as the API sent it: the v1 vocabulary is a
 * documented Spanish contract for API clients, so the UI translates by code
 * instead (see `apiErrorMessage`) and never shows that message verbatim.
 *
 * It sits in its own module because demo mode raises the same failures from
 * the browser, and importing them from `client-api` would make the two
 * modules depend on each other in a circle.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}
