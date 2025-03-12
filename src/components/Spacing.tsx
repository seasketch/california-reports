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
              <Trans i18nKey="Spacing - intro">
                <p>
                  To evaluate habitat spacing:
                  <ul>
                    <li>
                      Only MPAs with a level of protection (LOP) of very high,
                      high, or moderate-high are considered.
                    </li>
                    <li>
                      Only MPAs or MPA clusters (i.e., adjacent MPAs that both
                      meet the LOP guideline) that meet the minimum size
                      guideline of 9 square miles are considered (with the
                      exception of estuarine habitat - analyses for this habitat
                      may consider MPAs of any size).
                    </li>
                    <li>
                      Spacing for each habitat is considered separately. Only
                      MPAs that contain sufficient extent of habitat to be
                      counted as a replicate are considered. Please note that
                      the analysis on SeaSketch follows the habitat guidelines
                      developed for the South Coast planning region; other
                      regions may use slightly different metrics.
                    </li>
                    <li>
                      Maximum gaps between MPAs containing a given habitat are
                      tabulated. Spacing guidelines advise gaps of 31-62 statute
                      miles between replicates.
                    </li>
                  </ul>
                </p>
              </Trans>
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
                            /* i18next-extract-disable-next-line */
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
