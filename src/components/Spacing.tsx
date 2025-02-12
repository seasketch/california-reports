import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Card,
  InfoStatus,
  Pill,
  ReportError,
  ResultsCard,
  SimpleButton,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { ReplicateMap, SpacingObjectives } from "../util/Spacing.js";
import { Feature, LineString, Polygon, Sketch } from "@seasketch/geoprocessing";

export const Spacing: React.FunctionComponent<any> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();

  const [mapData, setData] = useState({
    title: "",
    sketch: [] as Sketch<Polygon>[],
    replicates: [] as string[],
    paths: [] as {
      path: Feature<LineString>;
      distance: number;
      color: string;
    }[],
  });

  const spacingTitle: Record<string, string> = {
    kelp: t("Kelp"),
    estuaries: t("Estuary"),
    rocky_shores: t("Rocky Shore"),
    beaches: t("Beach"),
    eelgrass: t("Eelgrass"),
    substrate31: t("Hard Substrate 30-100m"),
    substrate32: t("Soft Substrate 30-100m"),
    substrate101: t("Hard Substrate >100m"),
    substrate102: t("Soft Substrate >100m"),
  };

  if (!isCollection)
    return (
      <Card>
        <InfoStatus
          msg={
            <Trans i18nKey="Spacing Info">
              Spacing analysis is available only for collections of multiple
              MPAs.
            </Trans>
          }
        />
      </Card>
    );

  return (
    <ReportError>
      <ResultsCard
        title={mapData.title + " " + t("Spacing Report")}
        functionName="spacing"
      >
        {(data: {
          sketch: any;
          result: {
            id: string;
            replicates: string[];
            paths: {
              path: Feature<LineString>;
              distance: number;
              color: string;
            }[];
          }[];
        }) => {
          // Set sketches when lambda returns
          if (mapData.sketch.length === 0) {
            setData({
              sketch: data.sketch,
              title: "",
              replicates: [],
              paths: [],
            });
          }

          return (
            <>
              <SpacingObjectives data={mapData} />
              <ReplicateMap
                sketch={mapData.sketch}
                replicates={mapData.replicates}
                paths={mapData.paths}
              />
              {data.result.map((report) => (
                <p>
                  <Pill>{report.replicates.length}</Pill>{" "}
                  {
                    /* i18next-extract-disable-line */ t(
                      spacingTitle[report.id],
                    )
                  }{" "}
                  {t("habitat replicate(s)")}.
                  {report.replicates.length !== 0 && (
                    <SimpleButton
                      onClick={() =>
                        setData({
                          ...report,
                          title: spacingTitle[report.id],
                          sketch: data.sketch,
                        })
                      }
                    >
                      {t("Show on Map")}
                    </SimpleButton>
                  )}
                </p>
              ))}
            </>
          );
        }}
      </ResultsCard>
    </ReportError>
  );
};
