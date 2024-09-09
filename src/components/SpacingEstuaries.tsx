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
 * Spacing Estuaries component
 */
export const SpacingEstuaries: React.FunctionComponent<any> = (props) => {
  const { t } = useTranslation();

  // Labels
  const titleLabel = t("Estuaries");

  return (
    <ResultsCard
      title={titleLabel}
      useChildCard
      functionName="spacingEstuaries"
    >
      {(data: {
        sketch: Sketch<Polygon>[];
        replicateIds: string[];
        paths: any;
      }) => {
        return (
          <ReportError>
            <>
              <Pill>{data.replicateIds.length}</Pill> Estuary habitat
              replicate(s).
              {data.replicateIds.length !== 0 && (
                <SimpleButton
                  onClick={() => props.mapping({ ...data, title: "Estuary" })}
                >
                  Show on Map
                </SimpleButton>
              )}
            </>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};
