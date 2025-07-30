# Jittered Fractional Indexing

[![npm version](https://img.shields.io/npm/v/jittered-fractional-indexing.svg)](https://www.npmjs.com/package/jittered-fractional-indexing)
[![Node version](https://img.shields.io/node/v/jittered-fractional-indexing.svg)](https://github.com/nathanhleung/jittered-fractional-indexing) 
[![GitHub license](https://img.shields.io/github/license/nathanhleung/jittered-fractional-indexing.svg)](https://github.com/nathanhleung/jittered-fractional-indexing/blob/master/LICENSE)

This package extends [rocicorp/fractional-indexing](https://github.com/rocicorp/fractional-indexing) with random jitter functionality to minimize the likelihood of index collisions when generating fractional indices concurrently.

[rocicorp/fractional-indexing](https://github.com/rocicorp/fractional-indexing) is in turn based on [Implementing Fractional Indexing
](https://observablehq.com/@dgreensp/implementing-fractional-indexing) by [David Greenspan](https://github.com/dgreensp). See the original [rocicorp/fractional-indexing README](https://github.com/rocicorp/fractional-indexing#readme) for more details.

## Differences vs. [rocicorp/fractional-indexing](https://github.com/rocicorp/fractional-indexing)

This package uses [rocicorp/fractional-indexing](https://github.com/rocicorp/fractional-indexing) under the hood, and generates jitter by binary splitting the key range until the desired number of bits of entropy is reached. For instance, if one bit of jitter is desired:

1. First, we generate an initial index, `midpoint`, between the specified lower bound `a` and upper bound `b` using the original, unjittered `fractional-indexing` package.
1. Then, with 50% probability each, we either generate a key between the original lower bound `a` and the `midpoint`, or a key between the `midpoint` and the original upper bound `b`.
1. At this point, we have one bit of randomness, so we return this key.
1. For more jitter, the process is repeated with the newly-generated key as the new lower or upper bound, with 50% probability each.

This runs in `O(jitterBits)` time with respect to the underlying `fractional-indexing` implementation (specifically, for `b` bits of jitter, we call the original, unjittered implementation of the `generateKeyBetween` function `b + 1` times).

At large (arguably non-human) scale, this jittering mechanism is not extremely efficient. On the flip side, the benefit of implementing jittering in this way is that the underlying fractional indexing implementation does not have to be modified at all. Instead, we can fully defer the fractional indexing logic to Rocicorp's existing, [popular](https://www.npmjs.com/package/fractional-indexing?activeTab=dependents), well-tested implementation and keep this package focused solely on adding jittering.

## API

### `generateKeyBetween`

Generate a single key in between two points, with random jitter.

```ts
generateKeyBetween(
  a: string | null | undefined, // start
  b: string | null | undefined, // end
  opts?: {
    digits?: string = BASE_62_DIGITS; // optional character encoding
    jitterBits?: number = 30; // optional jitter bits count
    getRandomBit?: () => boolean = Math.random() < 0.5; // optional custom randomness
  },
): string
```

For cryptographically-sensitive applications, the default `Math.random()`-based `getRandomBit` function can be replaced with an implementation that uses [`Crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) (browser) or [`node:crypto`](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback) instead. This custom `getRandomBit` function must return a uniformly-distributed (i.e., 50% chance of a `true` or `false` result) boolean for an unbiased key.

To select a more appropriate `jitterBits` argument for your use-case (it defaults to 30), [birthday bounds](https://en.wikipedia.org/wiki/Birthday_attack) can be used to estimate the probability of collision, i.e., with $`k`$ keys and $`b`$ bits of jitter, the probability of collision is

$$1 - \frac{(2^b)!}{(2^b - k)!(2^b)^k}$$

For example, when $`b = 30`$ and $`k = 10000`$, there is a ~4.5% chance of collision. Note that this calculation is specific to $`a`$ and $`b`$, i.e., it applies when 10,000 keys are generated at the same time for  the same $`a`$ and $`b`$, and is not a general probability of collision for all key ranges.

```ts
import { generateKeyBetween } from 'jittered-fractional-indexing';

const first = generateKeyBetween(null, null); // "a3MdwWG"

// Insert after 1st
const second = generateKeyBetween(first, null); // "a5mlAoC"

// Insert after 2nd
const third = generateKeyBetween(second, null); // "aAGCU4l"

// Insert before 1st
const zeroth = generateKeyBetween(null, first); // "a2FR3vI"

// Insert in between 2nd and 3rd (midpoint)
const secondAndHalf = generateKeyBetween(second, third); // "a5u4jxwl"
```

### `generateNKeysBetween`

Use this when generating multiple keys at some known position, as it spaces out indexes more evenly and leads to shorter keys.

```ts
generateNKeysBetween(
  a: string | null | undefined, // start
  b: string | null | undefined, // end
  n: number, // number of keys to generate evenly between start and end
  opts?: {
    digits?: string = BASE_62_DIGITS; // optional character encoding
    jitterBits?: number = 30, // optional jitter bits count
    getRandomBit?: () => boolean; // optional custom randomness
  },
): string[]
```

```ts
import { generateNKeysBetween } from 'jittered-fractional-indexing';

const first = generateNKeysBetween(null, null, 2); // ['a0bNAd5V', 'a1Gbzq0G']

// Insert two keys after 2nd
const afterSecond = generateNKeysBetween(first[1], null, 2); // ['a2fHQHyV', 'a3DmSeLV']

// Insert two keys before 1st
const beforeFirst = generateNKeysBetween(null, first[0], 2); // ['ZyD7f85V', 'ZzFK2gHV']

// Insert two keys in between 1st and 2nd (midpoints)
const betweenFirstAndSecond = generateNKeysBetween(first[0], first[1], 2); // ['a0zsO5CZ', 'a10oyKZK']
```
