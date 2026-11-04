import { describe, expect, it } from "vitest";
import { dureeLisible } from "./duree";

describe("dureeLisible", () => {
  it.each([
    [0, "0 s"],
    [999, "0 s"],
    [42_000, "42 s"],
    [65_000, "1 min 05 s"],
    [600_000, "10 min 00 s"],
    [-500, "0 s"],
  ])("%i ms se lit « %s »", (millisecondes, attendu) => {
    expect(dureeLisible(millisecondes)).toBe(attendu);
  });
});
