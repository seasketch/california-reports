import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingEstuaries } from "./spacingEstuaries.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingEstuaries).toBe("function");
  });
  test("spacingEstuaries - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingEstuaries(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingEstuaries", example.properties.name);
    }
  }, 60000);
});
