import {
  Sketch,
  SketchCollection,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";

export const groups = ["SMCA", "SMCANT", "SMP", "SMR", "SMRMA", "Special"];
export const groupColors = [
  "#0070FF",
  "#C500FF",
  "#FFFF00",
  "#E60000",
  "#4CE600",
  "#FF00C5",
];

// Display values for groups (plural)
export const groupDisplayMapPl: Record<string, string> = {
  SMCA: "State Marine Conservation Area(s)",
  SMCANT: "State Marine Conservation Area(s) (No-Take)",
  SMP: "State Marine Park(s)",
  SMR: "State Marine Reserve(s)",
  SMRMA: "State Marine Recreation Management Area(s)",
  Special: "Special Closure(s)",
};

// Display values for groups (singular)
export const groupDisplayMapSg: Record<string, string> = {
  SMCA: "State Marine Conservation Area",
  SMCANT: "State Marine Conservation Area (No-Take)",
  SMP: "State Marine Park",
  SMR: "State Marine Reserve",
  SMRMA: "State Marine Recreation Management Area",
  Special: "Special Closure",
};

// Mapping groupIds to colors
export const groupColorMap: Record<string, string> = {
  SMCA: "#0070FF",
  SMCANT: "#C500FF",
  SMP: "#FFFF00",
  SMR: "#E60000",
  SMRMA: "#4CE600",
  Special: "#FF00C5",
};
export const groupColorMapTransparent: Record<string, string> = {
  SMCA: "#0070FF80",
  SMCANT: "#C500FF80",
  SMP: "#FFFF0080",
  SMR: "#E6000080",
  SMRMA: "#4CE60080",
  Special: "#FF00C580",
};

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

      if (!designation)
        throw new Error(
          `${sketch.properties.name} has no proposed designation.`
        );

      levels[sketch.properties.id] = designation;

      return levels;
    },
    {}
  );

  return protectionLevels;
}
