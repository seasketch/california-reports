import { Card, useSketchProperties } from "@seasketch/geoprocessing/client-ui";
import React from "react";
import { useTranslation } from "react-i18next";

export interface SketchAttributesCardProps {
  title?: string;
  autoHide?: boolean;
  /** Map from value IDs to human readable for one or more exportIds */
  mappings?: { [exportId: string]: { [value: string]: string } };
}

export const SketchAttributesCard = ({
  title,
  autoHide,
}: SketchAttributesCardProps) => {
  const [{ isCollection }] = useSketchProperties();
  const titleStyle: React.CSSProperties = {
    fontSize: "1em",
    fontWeight: 500,
    color: "#6C7282",
    marginBottom: "1.5em",
  };

  const [properties] = useSketchProperties();
  const { t, i18n } = useTranslation();

  const attributesLabel = t("More Info");

  const propertiesToDisplay = [
    "type",
    "proposed_designation",
    "Study_Regi",
    "Bioregion",
    "Petition",
    "Change_Cat",
    "PetitionLi",
  ];

  if (autoHide === true && properties.userAttributes.length === 0) {
    return null;
  }
  if (!isCollection) {
    return (
      <Card titleStyle={titleStyle} title={title || attributesLabel}>
        <table style={{ width: "100%" }}>
          <tbody>
            {propertiesToDisplay.map((prop) => {
              let label; // label: "Designation"
              let valueLabel; // valueLabel: "Fully Protected",

              const attr = properties.userAttributes.find(
                (attr) => attr.exportId === prop,
              );

              if (!attr)
                throw Error(`Attribute ${prop} not found in userAttributes`);

              // seasketch next - has label and optional translation
              if (attr.label) {
                label = attr.label;

                // If language not english, override with translation if available
                if (i18n.language === "en") {
                  label = attr.label;
                } else if (
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  label = attr.alternateLanguages[i18n.language].label;
                }
              }

              // seasketch next - has valueLabel and optional translation
              if (attr.valueLabel) {
                valueLabel = attr.valueLabel;

                // If language not english, override with translation if available
                if (
                  i18n.language !== "en" &&
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  valueLabel =
                    attr.alternateLanguages[i18n.language].valueLabel;
                }
              } else if (attr.value) {
                valueLabel = attr.value;

                // If language not english, override with translation if available
                if (
                  i18n.language !== "en" &&
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  valueLabel =
                    attr.alternateLanguages[i18n.language].valueLabel;
                }
              } else {
                valueLabel = t("N/A");
              }

              return (
                <tr key={attr.exportId} style={{ verticalAlign: "top" }}>
                  <td
                    style={{
                      padding: 0,
                      paddingRight: 4,
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                      paddingLeft: 6,
                    }}
                  >
                    {typeof valueLabel === "string" &&
                    valueLabel.startsWith("http") ? (
                      <a
                        href={valueLabel}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(valueLabel)}
                      </a>
                    ) : (
                      /* @ts-expect-error type mismatch */
                      t(valueLabel)
                    )}
                  </td>
                  {/* <span>{attr.label}</span>=<span>{attr.value}</span> */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  } else {
    return (
      <Card titleStyle={titleStyle} title={title || attributesLabel}>
        <table style={{ width: "100%" }}>
          <tbody>
            {properties.userAttributes.map((attr) => {
              let label; // label: "Designation"
              let valueLabel; // valueLabel: "Fully Protected",

              if (!attr)
                throw Error(`Attribute ${attr} not found in userAttributes`);

              // seasketch next - has label and optional translation
              if (attr.label) {
                label = attr.label;

                // If language not english, override with translation if available
                if (i18n.language === "en") {
                  label = attr.label;
                } else if (
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  label = attr.alternateLanguages[i18n.language].label;
                }
              }

              // seasketch next - has valueLabel and optional translation
              if (attr.valueLabel) {
                valueLabel = attr.valueLabel;

                // If language not english, override with translation if available
                if (
                  i18n.language !== "en" &&
                  attr.alternateLanguages &&
                  Object.keys(attr.alternateLanguages).includes(i18n.language)
                ) {
                  // Swap in translation
                  valueLabel =
                    attr.alternateLanguages[i18n.language].valueLabel;
                }
              } else {
                valueLabel = t("N/A");
              }

              return (
                <tr key={attr.exportId} style={{ verticalAlign: "top" }}>
                  <td
                    style={{
                      padding: 0,
                      paddingRight: 4,
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #f5f5f5",
                      paddingBottom: 6,
                      paddingTop: 6,
                      paddingLeft: 6,
                    }}
                  >
                    {
                      /* @ts-expect-error type mismatch */
                      t(valueLabel)
                    }
                  </td>
                  {/* <span>{attr.label}</span>=<span>{attr.value}</span> */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  }
};

export default SketchAttributesCard;
