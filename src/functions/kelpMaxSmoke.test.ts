/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { kelpMax } from "./kelpMax.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof kelpMax).toBe("function");
  });
  test("kelpMax - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await kelpMax(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "kelpMax", example.properties.name);
    }
  }, 60000);
});
