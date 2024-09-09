import React from "react";
import { useTranslation } from "react-i18next";
import {
  Pill,
  ReportError,
  ResultsCard,
  SimpleButton,
} from "@seasketch/geoprocessing/client-ui";
import { Polygon, Sketch } from "@seasketch/geoprocessing/client-core";

/**
 * Spacing Kelp component
 */
export const SpacingKelp: React.FunctionComponent<any> = (props) => {
  const { t } = useTranslation();

  // Labels
  const titleLabel = t("Kelp");

  return (
    <ResultsCard title={titleLabel} useChildCard functionName="spacingKelp">
      {(data: {
        sketch: Sketch<Polygon>[];
        replicateIds: string[];
        paths: any;
      }) => {
        return (
          <ReportError>
            <>
              <Pill>{data.replicateIds.length}</Pill> Kelp habitat replicate(s).
              <SimpleButton
                onClick={() => props.mapping({ ...data, title: "Kelp" })}
              >
                Show on Map
              </SimpleButton>
            </>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
