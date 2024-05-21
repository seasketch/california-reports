/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { regions } from "./regions.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof regions).toBe("function");
  });
  test("regions - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await regions(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "regions", example.properties.name);
    }
  }, 60000);
});
