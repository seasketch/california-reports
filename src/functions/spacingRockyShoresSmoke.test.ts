import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingRockyShores } from "./spacingRockyShores.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingRockyShores).toBe("function");
  });
  test("spacingRockyShores - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingRockyShores(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingRockyShores", example.properties.name);
    }
  }, 60000);
});
