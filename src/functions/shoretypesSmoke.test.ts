/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { shoretypes } from "./shoretypes.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof shoretypes).toBe("function");
  });
  test("shoretypes - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await shoretypes(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "shoretypes", example.properties.name);
    }
  }, 60000);
});
