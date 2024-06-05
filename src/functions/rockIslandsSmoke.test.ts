/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { rockIslands } from "./rockIslands.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof rockIslands).toBe("function");
  });
  test("rockIslands - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await rockIslands(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "rockIslands", example.properties.name);
    }
  }, 60000);
});
