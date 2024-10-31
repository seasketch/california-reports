import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { span } from "./span.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof span).toBe("function");
  });
  test("span - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await span(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "span", example.properties.name);
    }
  }, 180000);
});
