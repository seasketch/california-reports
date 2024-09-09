import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingKelp } from "./spacingKelp.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingKelp).toBe("function");
  });
  test("spacingKelp - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingKelp(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingKelp", example.properties.name);
    }
  }, 60000);
});
