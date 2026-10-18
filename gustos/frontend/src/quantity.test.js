import { describe, expect, test } from "vitest";
import { parseQuantity, quantityForInput } from "./quantity.js";

describe("parseQuantity", () => {
  test.each([
    ["500", 500],
    ["0,5", 0.5],
    ["1.25", 1.25],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["1 ½", 1.5],
    ["½", 0.5],
    ["2 ¼", 2.25],
    [" 3 ", 3],
  ])("„%s” → %s", (input, expected) => {
    expect(parseQuantity(input)).toEqual({ quantity: expected, quantity_text: null });
  });

  test.each(["2-3", "un praf", "câteva", "1/0"])("„%s” rămâne text", (input) => {
    expect(parseQuantity(input)).toEqual({ quantity: null, quantity_text: input });
  });

  test("gol", () => {
    expect(parseQuantity("  ")).toEqual({ quantity: null, quantity_text: null });
    expect(parseQuantity(undefined)).toEqual({ quantity: null, quantity_text: null });
  });
});

describe("quantityForInput", () => {
  test("numere și fracții", () => {
    expect(quantityForInput({ quantity: 500 })).toBe("500");
    expect(quantityForInput({ quantity: 0.5 })).toBe("1/2");
    expect(quantityForInput({ quantity: 1.5 })).toBe("1 1/2");
    expect(quantityForInput({ quantity: 1 / 3 })).toBe("1/3");
    expect(quantityForInput({ quantity: 0.2 })).toBe("0,2");
  });
  test("text", () => {
    expect(quantityForInput({ quantity: null, quantity_text: "un praf" })).toBe("un praf");
    expect(quantityForInput({ quantity: null, quantity_text: null })).toBe("");
  });
  test("dus-întors", () => {
    for (const q of [0.25, 1.5, 2 / 3, 750, 0.2]) {
      expect(parseQuantity(quantityForInput({ quantity: q })).quantity).toBeCloseTo(q, 6);
    }
  });
});
