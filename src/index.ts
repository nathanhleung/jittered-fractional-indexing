// License: CC0 (no rights reserved).

import {
  generateKeyBetween as unjitteredGenerateKeyBetween,
  generateNKeysBetween as unjitteredGenerateNKeysBetween,
} from "fractional-indexing";

const DEFAULT_JITTER_BITS = 30;
const DEFAULT_GET_RANDOM_BIT = () => Math.random() < 0.5;

/**
 * Validates that `n` is a positive integer.
 *
 * @param paramName - The name of the parameter to validate.
 * @param n - The parameter to validate.
 */
function assertIsPositiveInteger(paramName: string, n: number) {
  if (!Number.isInteger(n)) {
    throw new Error(`"${paramName}" must be an integer, got '${n}'`);
  }

  if (n < 0) {
    throw new Error(
      `"${paramName}" must be greater than or equal to 0, got '${n}'`,
    );
  }
}

/**
 * Generates a fractional index key between two keys, with `jitterBits` for
 * collision avoidance.
 *
 * The implementation works by binary splitting the key range until the desired
 * number of bits of jitter is reached. For instance, for one bit of jitter, we
 * first generate a key between the original lower and upper bounds, then with
 * 50% probability each, we either generate a key between the original lower
 * bound and the midpoint, or a key between the midpoint and the original upper
 * bound. At this point, we have one bit of jitter, so we return this key.
 *
 * Runs in O(`jitterBits`) time with respect to the underlying
 * `fractional-indexing` implementation (specifically, for `b` bits of jitter,
 * we call the underlying, unjittered implementation of `generateKeyBetween`
 * `b + 1` times).
 *
 * @param a - Lower bound of the key range.
 * @param b - Upper bound of the key range.
 * @param opts - Optional configuration.
 * @param opts.digits - The digits to use for the key. Defaults to
 *   `fractional-indexing`'s default.
 * @param opts.jitterBits - The number of bits of jitter. Defaults to 30.
 *   Birthday bounds can be used to estimate the probability of collision
 *   given a specific number of keys and bits of jitter, i.e., with
 *   `k` keys and `b` bits of jitter, the probability of collision is
 *   `1 - (2^b)!/((2^b - k)!(2^b)^k)`. When `b = 30` and `k = 10_000`, we get
 *   a ~4.5% chance of collision. Note that this probability is specific to `a`
 *   and `b`, i.e., it is when 10,000 keys are generated at the same time for
 *   the same `a` and `b`; it is not a general probability of collision for all
 *   key ranges.
 * @param opts.getRandomBit - A function to generate a random bit. Defaults to
 *   `Math.random() < 0.5`. For cryptographic randomness, use
 *   `crypto.getRandomValues()` (browser) or `node:crypto`. The custom
 *   `getRandomBit` function must return a uniformly-distributed (i.e., 50%
 *   chance of a `true` or `false` result) boolean for an unbiased key.
 * @returns A new, jittered fractional index key between `a` and `b`.
 */
export function generateKeyBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  opts?: {
    digits?: string;
    jitterBits?: number;
    getRandomBit?: () => boolean;
  },
) {
  const {
    digits,
    jitterBits = DEFAULT_JITTER_BITS,
    getRandomBit = DEFAULT_GET_RANDOM_BIT,
  } = opts ?? {};

  assertIsPositiveInteger("jitterBits", jitterBits);

  let remainingJitterBits = jitterBits;
  let low = a;
  let high = b;
  let midpoint = unjitteredGenerateKeyBetween(a, b, digits);

  while (remainingJitterBits > 0) {
    const randomBit = getRandomBit() ? 1 : 0;
    if (randomBit === 1) {
      low = midpoint;
    } else {
      high = midpoint;
    }

    midpoint = unjitteredGenerateKeyBetween(low, high, digits);
    remainingJitterBits--;
  }

  return midpoint;
}

/**
 * Generates `n` fractional index keys between two keys, with `jitterBits` for
 * collision avoidance.
 *
 * The implementation works by generating `n + 1` keys between `a` and `b`
 * using the underlying `fractional-indexing` implementation, then generating a
 * jittered key in each space using the jittered `generateKeyBetween`
 * implementation. When `jitterBits` is 0, the function falls back on the
 * underlying, unjittered implementation of `generateNKeysBetween` from
 * `fractional-indexing`.
 *
 * Runs in approximately O(`n * jitterBits`) time with respect to the unjittered
 * `fractional-indexing` implementation of `generateKeyBetween` (specifically,
 * for each of the `n` keys to generate, we call the unjittered implementation
 * of `generateKeyBetween` `b + 1` times where `b` is the number of bits of
 * jitter).
 *
 * @param a - Lower bound of the key range.
 * @param b - Upper bound of the key range.
 * @param opts - Optional configuration.
 * @param opts.digits - The digits to use for the key, passed to
 *   `generateKeyBetween`.
 * @param opts.jitterBits - The number of bits of jitter *per key*, passed to
 *   `generateKeyBetween`.
 * @param opts.getRandomBit - A function to generate a random bit, passed to
 *   `generateKeyBetween`.
 * @returns `n` new, jittered fractional index keys between `a` and `b`.
 */
export function generateNKeysBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  n: number,
  opts?: {
    digits?: string;
    jitterBits?: number;
    getRandomBit?: () => boolean;
  },
) {
  const { digits, jitterBits } = opts ?? {};

  assertIsPositiveInteger("n", n);

  if (n === 0) {
    return [];
  }

  if (jitterBits === 0) {
    return unjitteredGenerateNKeysBetween(a, b, n, digits);
  }

  // `n + 1` keys between `a` and `b` give us `n` spaces between them
  const keys = unjitteredGenerateNKeysBetween(a, b, n + 1, digits);

  // Then, we generate a jittered key in each space
  const jitteredKeys = [];
  for (let i = 0; i < n; i++) {
    const currentKey = keys[i];
    const nextKey = keys[i + 1];
    jitteredKeys.push(generateKeyBetween(currentKey, nextKey, opts));
  }

  return jitteredKeys;
}
