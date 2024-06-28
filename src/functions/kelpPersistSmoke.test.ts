/**
 * @jest-environment node
 * @group smoke
 */
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { kelpPersist } from "./kelpPersist.js";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof kelpPersist).toBe("function");
  });
  test("kelpPersist - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await kelpPersist(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "kelpPersist", example.properties.name);
    }
  }, 60000);
});
