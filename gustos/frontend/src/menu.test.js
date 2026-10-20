import { describe, expect, it } from "vitest";
import { longDate, menuTitle, mondayOf, parseDate, toIso, weekRange, weekday } from "./menu.js";

describe("datele meniului", () => {
  it("găsește lunea săptămânii", () => {
    expect(toIso(mondayOf(parseDate("2026-10-22")))).toBe("2026-10-19"); // joi
    expect(toIso(mondayOf(parseDate("2026-10-25")))).toBe("2026-10-19"); // duminică
    expect(toIso(mondayOf(parseDate("2026-10-19")))).toBe("2026-10-19"); // luni
    expect(weekday(parseDate("2026-10-25"))).toBe(6);
  });

  it("scrie intervalul săptămânii în română", () => {
    expect(weekRange("2026-10-19")).toBe("19 – 25 octombrie 2026");
    expect(weekRange("2026-10-26")).toBe("26 octombrie – 1 noiembrie 2026");
    expect(weekRange("2026-12-28")).toBe("28 decembrie 2026 – 3 ianuarie 2027");
  });

  it("titlul meniului", () => {
    expect(menuTitle({ kind: "week", start_date: "2026-10-19" })).toBe("Săptămâna 19 – 25 octombrie 2026");
    expect(menuTitle({ kind: "event", title: "Crăciun", start_date: "2026-12-25" })).toBe("Crăciun");
    expect(longDate("2026-12-25")).toBe("25 decembrie 2026");
  });
});
