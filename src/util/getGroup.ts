import {
  Sketch,
  SketchCollection,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";

export const groups = ["SMR", "SMCANT", "SMCA", "SMRMA", "SMP", "Special"];
export const groupColors = [
  "#E60000",
  "#C500FF",
  "#0070FF",
  "#4CE600",
  "#FFFF00",
  "#FF00C5",
];

// Display values for groups (plural)
export const groupDisplayMapPl: Record<string, string> = {
  SMR: "State Marine Reserve(s)",
  SMCANT: "State Marine Conservation Area(s) (No-Take)",
  SMCA: "State Marine Conservation Area(s)",
  SMRMA: "State Marine Recreation Management Area(s)",
  SMP: "State Marine Park(s)",
  Special: "Special Closure(s)",
};

// Display values for groups (singular)
export const groupDisplayMapSg: Record<string, string> = {
  SMR: "State Marine Reserve",
  SMCANT: "State Marine Conservation Area (No-Take)",
  SMCA: "State Marine Conservation Area",
  SMRMA: "State Marine Recreation Management Area",
  SMP: "State Marine Park",
  Special: "Special Closure",
};

// Mapping groupIds to colors
export const groupColorMap: Record<string, string> = {
  SMR: "#E60000",
  SMCANT: "#C500FF",
  SMCA: "#0070FF",
  SMP: "#FFFF00",
  SMRMA: "#4CE600",
  Special: "#FF00C5",
};
export const groupColorMapTransparent: Record<string, string> = {
  SMR: "#E6000080",
  SMCANT: "#C500FF80",
  SMCA: "#0070FF80",
  SMP: "#FFFF0080",
  SMRMA: "#4CE60080",
  Special: "#FF00C580",
};

/**
 * Gets MPA Protection levels for all MPAs in a sketch collection from user attributes
 * @param sketch User-created Sketch | SketchCollection
 * @returns <string, string> mapping of sketchId to protection level
 */
export function getGroup(
  sketch: Sketch | SketchCollection | NullSketchCollection | NullSketch,
): Record<string, string> {
  const sketchFeatures = getSketchFeatures(sketch);
  const protectionLevels = sketchFeatures.reduce<Record<string, string>>(
    (levels, sketch) => {
      const designation = getUserAttribute(
        sketch.properties,
        "proposed_designation",
        "",
      ).toString();

      if (!designation)
        throw new Error(
          `${sketch.properties.name} has no proposed designation.`,
        );

      levels[sketch.properties.id] = designation;

      return levels;
    },
    {},
  );

  return protectionLevels;
}
