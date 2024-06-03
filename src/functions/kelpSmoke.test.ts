/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { kelp } from "./kelp.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof kelp).toBe("function");
  });
  test("kelp - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await kelp(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "kelp", example.properties.name);
    }
  }, 60000);
});
