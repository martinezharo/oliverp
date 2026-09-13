/**
 * Whether the browser is currently looking at the demo.
 *
 * The flag is set by the application shell, which learns it from the httpOnly
 * cookie the Worker reads for it. It lives in its own module so that
 * `client-api`, which the login and landing pages also load, can ask the
 * question without pulling the sample business into their bundles.
 */

let active = false;

export function setDemoActive(value: boolean): void {
  active = value;
}

export function isDemoActive(): boolean {
  return active;
}
