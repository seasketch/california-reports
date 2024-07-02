/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { eelgrass } from "./eelgrass.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof eelgrass).toBe("function");
  });
  test("eelgrass - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await eelgrass(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "eelgrass", example.properties.name);
    }
  }, 60000);
});
