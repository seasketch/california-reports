/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { bioregions } from "./bioregions.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof bioregions).toBe("function");
  });
  test("bioregions - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await bioregions(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "bioregions", example.properties.name);
    }
  }, 60000);
});
