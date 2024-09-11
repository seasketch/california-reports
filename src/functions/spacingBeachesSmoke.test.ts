import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { spacingBeaches } from "./spacingBeaches.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof spacingBeaches).toBe("function");
  });
  test("spacingBeaches - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await spacingBeaches(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "spacingBeaches", example.properties.name);
    }
  }, 60000);
});
