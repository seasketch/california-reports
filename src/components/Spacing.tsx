import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
    kelpMax: "Kelp",
    estuaries: "Estuary",
    rocky_shores: "Rocky Shore",
    beaches: "Beach",
    eelgrass: "Eelgrass",
  };

  if (!isCollection)
    return (
      <Card>
        <InfoStatus
          msg={
            <>
              Spacing analysis is available only for collections of multiple
              MPAs.
            </>
          }
        />
      </Card>
    );

  return (
    <ReportError>
      <ResultsCard
        title={mapData.title + " Spacing Report"}
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
                  {spacingTitle[report.id]} habitat replicate(s).
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
                      Show on Map
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
