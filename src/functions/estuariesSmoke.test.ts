/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { estuaries } from "./estuaries.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof estuaries).toBe("function");
  });
  test("estuaries - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await estuaries(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "estuaries", example.properties.name);
    }
  }, 60000);
});
