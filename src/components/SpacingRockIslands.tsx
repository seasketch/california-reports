import React from "react";
import { useTranslation } from "react-i18next";
import {
  Pill,
  ReportContext,
  ReportError,
  ResultsCard,
  SimpleButton,
  Skeleton,
} from "@seasketch/geoprocessing/client-ui";
import { Polygon, Sketch } from "@seasketch/geoprocessing/client-core";

/**
 * Spacing SpacingRockIslands component
 */
export const SpacingRockIslands: React.FunctionComponent<any> = (props) => {
  const { t } = useTranslation();

  // Labels
  const titleLabel = t("Rock Islands");

  return (
    <ResultsCard
      useChildCard
      skeleton={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {titleLabel} <Skeleton style={{ width: "50%" }} />
        </div>
      }
      functionName="spacingRockIslands"
    >
      {(data: {
        sketch: Sketch<Polygon>[];
        replicateIds: string[];
        paths: any;
      }) => {
        return (
          <ReportError>
            <>
              <Pill>{data.replicateIds.length}</Pill> Rock island habitat
              replicate(s).
              <SimpleButton
                onClick={() => props.mapping({ ...data, title: "Rock Island" })}
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
