import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { habitatNearshore } from "./habitatNearshore.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof habitatNearshore).toBe("function");
  });
  test("habitatNearshore - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await habitatNearshore(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "habitatNearshore", example.properties.name);
    }
  }, 500_000);
});
