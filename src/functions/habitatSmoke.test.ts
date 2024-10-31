/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { habitat } from "./habitat.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof habitat).toBe("function");
  });
  test("habitat - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await habitat(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "habitat", example.properties.name);
    }
  }, 180000);
});
