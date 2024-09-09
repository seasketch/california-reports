import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingRockIslands } from "./spacingRockIslands.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingRockIslands).toBe("function");
  });
  test("spacingRockIslands - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingRockIslands(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingRockIslands", example.properties.name);
    }
  }, 60000);
});
