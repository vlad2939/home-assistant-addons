import { describe, expect, test } from "vitest";
import { formatQuantity, formatUnit, groupIngredients, ingredientAmount, scaleQuantity } from "./scale.js";

describe("scaleQuantity", () => {
  test("proporțional cu porțiile", () => {
    expect(scaleQuantity(500, 4, 8)).toBe(1000);
    expect(scaleQuantity(1, 4, 2)).toBe(0.5);
  });
  test("fără porții de bază nu se modifică", () => {
    expect(scaleQuantity(3, null, 6)).toBe(3);
  });
  test("cantitate lipsă rămâne lipsă", () => {
    expect(scaleQuantity(null, 4, 8)).toBeNull();
  });
});

describe("formatQuantity", () => {
  test("fracții pentru unități de bucătărie", () => {
    expect(formatQuantity(0.5, "linguriță")).toBe("½");
    expect(formatQuantity(1.25, "cană")).toBe("1 ¼");
    expect(formatQuantity(2 / 3, "lingură")).toBe("⅔");
    expect(formatQuantity(1.5, "bucată")).toBe("1 ½");
    expect(formatQuantity(3, "bucată")).toBe("3");
  });
  test("grame și mililitri rotunjite", () => {
    expect(formatQuantity(487.5, "g")).toBe("490");
    expect(formatQuantity(250, "g")).toBe("250");
    expect(formatQuantity(12.4, "ml")).toBe("12");
    expect(formatQuantity(7.5, "g")).toBe("7,5");
  });
  test("virgulă zecimală românească", () => {
    expect(formatQuantity(1.4, "linguriță")).toBe("1,4");
  });
});

describe("formatUnit", () => {
  test("plural peste 1", () => {
    expect(formatUnit("bucată", 1)).toBe("bucată");
    expect(formatUnit("bucată", 2)).toBe("bucăți");
    expect(formatUnit("cățel", 4)).toBe("căței");
    expect(formatUnit("lingură", 0.5)).toBe("lingură");
    expect(formatUnit("g", 500)).toBe("g");
  });
});

describe("ingredientAmount", () => {
  test("„la gust” și „un praf” nu se scalează", () => {
    expect(ingredientAmount({ quantity: null, quantity_text: "un praf", unit: null }, 4, 8)).toBe("un praf");
    expect(ingredientAmount({ quantity: null, quantity_text: null, unit: "la gust" }, 4, 8)).toBe("la gust");
    expect(ingredientAmount({ quantity: null, quantity_text: "2-3", unit: "lingură" }, 4, 8)).toBe("2-3 linguri");
    expect(ingredientAmount({ quantity: null, quantity_text: "1-2", unit: "cățel" }, 4, 8)).toBe("1-2 căței");
    expect(ingredientAmount({ quantity: null, quantity_text: "o", unit: "cană" }, 4, 8)).toBe("o cană");
  });
  test("cantitățile numerice se scalează", () => {
    expect(ingredientAmount({ quantity: 500, unit: "g" }, 4, 6)).toBe("750 g");
    expect(ingredientAmount({ quantity: 1, unit: "bucată" }, 4, 8)).toBe("2 bucăți");
    expect(ingredientAmount({ quantity: 1, unit: "linguriță" }, 4, 2)).toBe("½ linguriță");
  });
  test("sub 1 kg / 1 l trece în g / ml", () => {
    expect(ingredientAmount({ quantity: 1, unit: "kg" }, 8, 4)).toBe("500 g");
    expect(ingredientAmount({ quantity: 1, unit: "l" }, 4, 1)).toBe("250 ml");
    expect(ingredientAmount({ quantity: 1, unit: "kg" }, 4, 6)).toBe("1 ½ kg");
    expect(ingredientAmount({ quantity: 500, unit: "g" }, 6, 12)).toBe("1 kg");
    expect(ingredientAmount({ quantity: 500, unit: "ml" }, 4, 12)).toBe("1 ½ l");
    expect(ingredientAmount({ quantity: 900, unit: "g" }, 4, 4)).toBe("900 g");
  });
});

test("groupIngredients păstrează ordinea grupurilor", () => {
  const groups = groupIngredients([
    { name: "a", group_name: "Aluat" },
    { name: "b", group_name: "Aluat" },
    { name: "c", group_name: "Umplutură" },
    { name: "d", group_name: null },
  ]);
  expect(groups.map((g) => [g.name, g.items.length])).toEqual([
    ["Aluat", 2],
    ["Umplutură", 1],
    [null, 1],
  ]);
});
