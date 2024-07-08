import {
  Sketch,
  SketchCollection,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";

// Designation of protection levels
export const groups = ["noTake", "limitedTake", "specialClosure"];
export const groupsDisplay = ["No-Take", "Limited-Take", "Special Closure"];

// Display values for groups (plural)
export const groupDisplayMapPl: Record<string, string> = {
  noTake: "No-Take Area(s)",
  limitedTake: "Limited-Take Area(s)",
  specialClosure: "Special Closure(s)",
};

// Display values for groups (singular)
export const groupDisplayMapSg: Record<string, string> = {
  noTake: "No-Take Area",
  limitedTake: "Limited-Take Area",
  specialClosure: "Special Closure",
};

// Mapping groupIds to colors
export const groupColorMap: Record<string, string> = {
  noTake: "#BEE4BE",
  limitedTake: "#FFE1A3",
  specialClosure: "#98DBF4",
};

// Designations of high and medium protection levels
export const noTakeZones = ["SMR", "SMCANT"];
export const limitedTakeZones = ["FMCA", "FMR", "SMCA", "RED", "SMP", "SMRMA"];
export const specialClosureZones = ["Special"];

/**
 * Gets MPA Protection levels for all MPAs in a sketch collection from user attributes
 * @param sketch User-created Sketch | SketchCollection
 * @returns <string, string> mapping of sketchId to protection level
 */
export function getGroup(
  sketch: Sketch | SketchCollection | NullSketchCollection | NullSketch
): Record<string, string> {
  const sketchFeatures = getSketchFeatures(sketch);
  const protectionLevels = sketchFeatures.reduce<Record<string, string>>(
    (levels, sketch) => {
      const designation = getUserAttribute(
        sketch.properties,
        "proposed_designation",
        ""
      ).toString();

      if (noTakeZones.includes(designation))
        levels[sketch.properties.id] = "noTake";
      else if (limitedTakeZones.includes(designation))
        levels[sketch.properties.id] = "limitedTake";
      else if (specialClosureZones.includes(designation))
        levels[sketch.properties.id] = "specialClosure";
      else levels[sketch.properties.id] = "default";

      return levels;
    },
    {}
  );

  return protectionLevels;
}
