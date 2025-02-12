import {
  Card,
  ReportError,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import React from "react";
import { useTranslation } from "react-i18next";

export interface SketchAttributesCardProps {
  title?: string;
  autoHide?: boolean;
  mappings?: { [exportId: string]: { [value: string]: string } };
}

export const SketchAttributesCard = ({
  title,
  autoHide,
}: SketchAttributesCardProps) => {
  const titleStyle: React.CSSProperties = {
    fontSize: "1em",
    fontWeight: 500,
    color: "#6C7282",
    marginBottom: "1.5em",
  };

  const [sketchProperties] = useSketchProperties();
  const { t, i18n } = useTranslation();

  const attributesLabel = t("More Info");

  const propIds = [
    "type",
    "proposed_designation",
    "Study_Regi",
    "Bioregion",
    "Petition",
    "Change_Cat",
    "PetitionLi",
    "storymap_url",
    "existing_lop",
    "proposed_lop",
    "bin",
    "commission_determination",
  ];

  console.log(sketchProperties);
  if (autoHide === true && sketchProperties.isCollection) {
    return null;
  }

  return (
    <Card titleStyle={titleStyle} title={title || attributesLabel}>
      <ReportError>
        <table style={{ width: "100%" }}>
          <tbody>
            {propIds.map((propId) => {
              let label = propId;
              let valueLabel: string | string[] = t("N/A");

              const sketchProp = sketchProperties.userAttributes.find(
                (attr) => attr.exportId === propId,
              );

              if (!sketchProp)
                console.log(
                  `Attribute ${sketchProp} not found in userAttributes`,
                );

              if (sketchProp && sketchProp.label) {
                label = sketchProp.label;

                if (
                  i18n.language !== "en" &&
                  sketchProp.alternateLanguages &&
                  Object.keys(sketchProp.alternateLanguages).includes(
                    i18n.language,
                  )
                )
                  label = sketchProp.alternateLanguages[i18n.language].label;
              }

              if (sketchProp && sketchProp.valueLabel) {
                valueLabel = sketchProp.valueLabel;

                if (
                  i18n.language !== "en" &&
                  sketchProp.alternateLanguages &&
                  Object.keys(sketchProp.alternateLanguages).includes(
                    i18n.language,
                  )
                )
                  valueLabel =
                    sketchProp.alternateLanguages[i18n.language].valueLabel ||
                    t("N/A");
              } else if (sketchProp && sketchProp.value)
                valueLabel = String(sketchProp.value);

              return (
                <tr key={propId} style={{ verticalAlign: "top" }}>
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
                        {t("Link")}
                      </a>
                    ) : (
                      valueLabel
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportError>
    </Card>
  );
};

export default SketchAttributesCard;
