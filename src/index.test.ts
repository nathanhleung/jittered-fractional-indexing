import { describe, test, expect, vi } from "vitest";
import { generateKeyBetween, generateNKeysBetween } from "./index";

describe("validateJitterBits", () => {
  test("should throw error for non-integer jitterBits", () => {
    expect(() => generateKeyBetween("a0", "a1", { jitterBits: 3.5 })).toThrow(
      "\"jitterBits\" must be an integer, got '3.5'",
    );
  });

  test("should throw error for negative jitterBits", () => {
    expect(() => generateKeyBetween("a0", "a1", { jitterBits: -1 })).toThrow(
      "\"jitterBits\" must be greater than or equal to 0, got '-1'",
    );
  });

  test("should accept zero jitterBits", () => {
    expect(() =>
      generateKeyBetween("a0", "a1", { jitterBits: 0 }),
    ).not.toThrow();
  });

  test("should accept positive integer jitterBits", () => {
    expect(() =>
      generateKeyBetween("a0", "a1", { jitterBits: 5 }),
    ).not.toThrow();
  });
});

describe("generateKeyBetween", () => {
  test("should generate a key between two bounds", () => {
    const key = generateKeyBetween("a0", "a1");
    expect(typeof key).toBe("string");
    expect(key > "a0").toBe(true);
    expect(key < "a1").toBe(true);
  });

  test("should work with null bounds", () => {
    const key1 = generateKeyBetween(null, "a1");
    const key2 = generateKeyBetween("a0", null);
    const key3 = generateKeyBetween(null, null);

    expect(typeof key1).toBe("string");
    expect(typeof key2).toBe("string");
    expect(typeof key3).toBe("string");
  });

  test("should use default jitterBits of 30", () => {
    const key1 = generateKeyBetween("a0", "a1");
    const key2 = generateKeyBetween("a0", "a1");

    // With 30 bits of jitter, there is a (1/2^30)^2 ~= (1/10^9)^2 = 1 in
    // 10^18 chance of collision for two keys generated at the same time with
    // the same bounds. If we ran this test every second, we should see this
    // once every 32 billion years.
    expect(key1).not.toBe(key2);
  });

  test("should respect custom jitterBits", () => {
    const key = generateKeyBetween("a0", "a1", { jitterBits: 5 });
    expect(typeof key).toBe("string");
    expect(key > "a0").toBe(true);
    expect(key < "a1").toBe(true);
  });

  test("should work with zero jitterBits", () => {
    const key1 = generateKeyBetween("a0", "a1", { jitterBits: 0 });
    const key2 = generateKeyBetween("a0", "a1", { jitterBits: 0 });

    // With zero jitter, keys should be identical
    expect(key1).toBe(key2);
  });

  test("should use custom getRandomBit function", () => {
    const mockGetRandomBit = vi.fn(() => true);
    const key = generateKeyBetween("a0", "a1", {
      jitterBits: 3,
      getRandomBit: mockGetRandomBit,
    });

    expect(mockGetRandomBit).toHaveBeenCalledTimes(3);
    expect(typeof key).toBe("string");
  });

  test("should use custom digits parameter", () => {
    const customDigits = "0123456789";
    const key = generateKeyBetween("a0", "a1", {
      digits: customDigits,
      jitterBits: 1,
    });

    expect(typeof key).toBe("string");
    expect(key > "a0").toBe(true);
    expect(key < "a1").toBe(true);
  });

  test("should generate different keys with same bounds and default random", () => {
    const keys = new Set();
    for (let i = 0; i < 10; i++) {
      keys.add(generateKeyBetween("a0", "a1", { jitterBits: 10 }));
    }

    // With 10 bits of jitter, the probability of all ten keys being the same
    // is (1/2^10)^10 ~= (1/10^3)^10 = 1 in 10^30. This is very unlikely.
    expect(keys.size).toBeGreaterThan(1);
  });

  test("should generate consistent keys with deterministic random function", () => {
    let callCount = 0;
    const deterministicRandom = () => {
      callCount++;
      return callCount % 2 === 0;
    };

    const key1 = generateKeyBetween("a0", "a1", {
      jitterBits: 5,
      getRandomBit: deterministicRandom,
    });

    callCount = 0;
    const key2 = generateKeyBetween("a0", "a1", {
      jitterBits: 5,
      getRandomBit: deterministicRandom,
    });

    expect(key1).toBe(key2);
  });
});

describe("generateNKeysBetween", () => {
  test("should generate n distinct keys between two bounds", () => {
    const keys = generateNKeysBetween("a0", "a1", 5);
    const keysSet = new Set(keys);

    expect(keys).toHaveLength(5);
    keys.forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key > "a0").toBe(true);
      expect(key < "a1").toBe(true);
    });

    // When using `generateNKeysBetween`, we should get 5 distinct keys no
    // matter the jitter.
    expect(keysSet.size).toBe(5);
  });

  test("should generate ordered keys", () => {
    const keys = generateNKeysBetween("a0", "a1", 5, { jitterBits: 0 });

    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  test("should work with null bounds", () => {
    const keys1 = generateNKeysBetween(null, "a1", 3);
    const keys2 = generateNKeysBetween("a0", null, 3);
    const keys3 = generateNKeysBetween(null, null, 3);

    expect(keys1).toHaveLength(3);
    expect(keys2).toHaveLength(3);
    expect(keys3).toHaveLength(3);
  });

  test("should fall back to unjittered implementation when jitterBits is 0", () => {
    const keys1 = generateNKeysBetween("a0", "a1", 3, { jitterBits: 0 });
    const keys2 = generateNKeysBetween("a0", "a1", 3, { jitterBits: 0 });

    expect(keys1).toEqual(keys2);
  });

  test("should generate different keys with jitter", () => {
    const keys1 = generateNKeysBetween("a0", "a1", 3, { jitterBits: 30 });
    const keys1Set = new Set(keys1);

    const keys2 = generateNKeysBetween("a0", "a1", 3, { jitterBits: 30 });
    const keys2Set = new Set(keys2);

    const intersection = new Set(
      [...keys1Set].filter((key) => keys2Set.has(key)),
    );

    // With 30 bits of jitter per key and 6 keys, the probability of there
    // being any intersection is approximately
    // 1 - (2^30)!/((2^30 - 6)!(2^30)^6) ~= 1 in 100 million
    expect(intersection.size).toBe(0);
  });

  test("should handle n = 0", () => {
    const keys = generateNKeysBetween("a0", "a1", 0);
    expect(keys).toHaveLength(0);
  });

  test("should handle n = 1", () => {
    const keys = generateNKeysBetween("a0", "a1", 1);
    expect(keys).toHaveLength(1);
    expect(keys[0] > "a0").toBe(true);
    expect(keys[0] < "a1").toBe(true);
  });

  test("should use custom options", () => {
    const mockGetRandomBit = vi.fn(() => false);
    const customDigits = "0123456789";

    const keys = generateNKeysBetween("a0", "a1", 2, {
      digits: customDigits,
      jitterBits: 2,
      getRandomBit: mockGetRandomBit,
    });

    expect(keys).toHaveLength(2);
    expect(mockGetRandomBit).toHaveBeenCalled();
  });

  test("should generate unique keys with sufficient jitter", () => {
    const keys = generateNKeysBetween("a0", "a1", 10, { jitterBits: 10 });
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(keys.length);
  });

  test("should maintain order even with jitter", () => {
    const keys = generateNKeysBetween("a0", "a1", 5, { jitterBits: 5 });

    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });
});

describe("edge cases and error handling", () => {
  test("should handle large jitterBits values", () => {
    const key = generateKeyBetween("a0", "a1", { jitterBits: 100 });
    expect(typeof key).toBe("string");
    expect(key > "a0").toBe(true);
    expect(key < "a1").toBe(true);
  });

  test("should handle large n values in generateNKeysBetween", () => {
    const keys = generateNKeysBetween("a0", "a1", 100, { jitterBits: 1 });
    expect(keys).toHaveLength(100);

    // Check ordering is maintained
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  test("should throw error for fractional n in generateNKeysBetween", () => {
    expect(() => generateNKeysBetween("a0", "a1", 3.7)).toThrow(
      "\"n\" must be an integer, got '3.7'",
    );
  });

  test("should not generate keys that are too long", () => {
    const low = "a0";
    let high = "a1";
    let i = 0;

    while (i < 50) {
      high = generateKeyBetween(low, high, { jitterBits: 30 });
      i++;
    }

    // Running the loop 50 times with 30 bits of jitter means that the key
    // is on the order of 1/2^80, which requires at least 25 leading zeroes in
    // base 10. So the base 62 representation of the key should be less than 26
    // characters.
    expect(high.length).toBeLessThan(26);
  });
});
