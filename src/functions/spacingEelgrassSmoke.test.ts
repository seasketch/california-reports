import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingEelgrass } from "./spacingEelgrass.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingEelgrass).toBe("function");
  });
  test("spacingEelgrass - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingEelgrass(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingEelgrass", example.properties.name);
    }
  }, 60000);
});
