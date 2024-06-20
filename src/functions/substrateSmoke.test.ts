/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { substrate } from "./substrate.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof substrate).toBe("function");
  });
  test("substrate - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await substrate(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "substrate", example.properties.name);
    }
  }, 60000);
});
