/**
 * @group smoke
 */
import { classification } from "./classification";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof classification).toBe("function");
  });
  test("classificationLevelSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await classification(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "classification", example.properties.name);
    }
  });
});
