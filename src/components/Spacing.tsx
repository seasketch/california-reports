import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Card,
  DataDownload,
  InfoStatus,
  Pill,
  ReportError,
  ResultsCard,
  SimpleButton,
  ToolbarCard,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { ReplicateMap } from "../util/Spacing.js";
import { Feature, LineString, Polygon, Sketch } from "@seasketch/geoprocessing";
import project from "../../project/index.js";

export const Spacing: React.FunctionComponent<any> = (props) => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const titleLabel = t("Spacing");

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
        title={t("Spacing Report")}
        functionName="spacing"
        useChildCard
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

          const metricGroup = project.getMetricGroup("spacing", t);

          return (
            <ToolbarCard
              title={mapData.title + " " + t("Spacing Report")}
              items={
                <DataDownload
                  filename={titleLabel}
                  data={data.result}
                  formats={["csv", "json"]}
                  placement="left-end"
                />
              }
            >
              <ReplicateMap
                sketch={mapData.sketch}
                replicates={mapData.replicates}
                paths={mapData.paths}
              />
              {data.result.map((report) => {
                const curClass = metricGroup.classes.find(
                  (c) => c.datasourceId === report.id,
                );
                if (!curClass) throw new Error("Class not found in Spacing");
                return (
                  <p>
                    <Pill>{report.replicates.length}</Pill>{" "}
                    {/* i18next-extract-disable-line */ t(curClass.display)}{" "}
                    {t("habitat replicate(s)")}.
                    {report.replicates.length !== 0 && (
                      <SimpleButton
                        onClick={() =>
                          setData({
                            ...report,
                            title: t(curClass.display),
                            sketch: data.sketch,
                          })
                        }
                      >
                        {t("Show on Map")}
                      </SimpleButton>
                    )}
                  </p>
                );
              })}
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </ReportError>
  );
};
