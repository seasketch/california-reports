import {
  getExamplePolygonSketchAll,
  writeResultOutput,
  polygonSmokeTest,
  getExampleFeatures,
} from "@seasketch/geoprocessing/scripts/testing";
import { describe, test, expect } from "vitest";
import { bathymetry } from "./bathymetry.js";
import handler, { clipToOceanEez } from "./clipToOceanEez.js";
import { classification } from "./classification.js";
import { boundaryAreaOverlap } from "./boundaryAreaOverlap.js";
import { eelgrass } from "./eelgrass.js";
import { estuaries } from "./estuaries.js";
import { habitatNearshore } from "./habitatNearshore.js";
import { habitat } from "./habitat.js";
import { kelp } from "./kelp.js";
import { shoretypes } from "./shoretypes.js";
import { spacing } from "./spacing.js";
import { span } from "./span.js";

// Create standard smoke tests
function createSmokeTest(
  functionName: string,
  functionToTest: Function,
  timeout: number = 60_000,
) {
  describe(functionName, () => {
    test("handler function is present", () => {
      expect(typeof functionToTest).toBe("function");
    });

    test(
      `${functionName} - tests run against all examples`,
      async () => {
        const examples = await getExamplePolygonSketchAll();
        for (const example of examples) {
          const result = await functionToTest(example);
          expect(result).toBeTruthy();
          writeResultOutput(result, functionName, example.properties.name);
        }
      },
      timeout,
    );
  });
}

const tests = [
  { name: "bathymetry", func: bathymetry },
  { name: "classification", func: classification },
  { name: "boundaryAreaOverlap", func: boundaryAreaOverlap },
  { name: "eelgrass", func: eelgrass, timeout: 500_000 },
  { name: "estuaries", func: estuaries },
  { name: "habitatNearshore", func: habitatNearshore, timeout: 500_000 },
  { name: "habitat", func: habitat, timeout: 180_000 },
  { name: "kelp", func: kelp, timeout: 180_000 },
  { name: "shoretypes", func: shoretypes, timeout: 180_000 },
  { name: "spacing", func: spacing, timeout: 1000_000 },
  { name: "span", func: span, timeout: 180_000 },
];

// Generate tests
tests.forEach(({ name, func, timeout }) => {
  createSmokeTest(name, func, timeout);
});

// clipToOceanEez - special case
describe("clipToOceanEez", () => {
  test("clipToOceanEez", async () => {
    const examples = await getExampleFeatures();
    polygonSmokeTest(clipToOceanEez, handler.options.title, examples, {
      timeout: 60_000,
      debug: false,
    });
  }, 60_000);
});
