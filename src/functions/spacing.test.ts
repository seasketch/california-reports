/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacing } from "./spacing.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacing).toBe("function");
  });
  test("spacing - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacing(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacing", example.properties.name);
    }
  }, 60000);
});
