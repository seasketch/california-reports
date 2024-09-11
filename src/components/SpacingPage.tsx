import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  InfoStatus,
  Pill,
  ReportError,
  ResultsCard,
  SimpleButton,
  Skeleton,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import { ReplicateMap, SpacingObjectives } from "./Spacing.js";
import { Polygon, Sketch } from "@seasketch/geoprocessing";

const ReportPage = () => {
  const { t } = useTranslation();
  const [{ isCollection }] = useSketchProperties();

  const [data, setData] = useState({
    title: "",
    sketch: [] as Sketch<Polygon>[],
    replicateIds: [] as string[],
    paths: [],
  });

  const spacingReports = [
    { title: "Kelp", functionName: "spacingKelp" },
    { title: "Estuary", functionName: "spacingEstuaries" },
    { title: "Rock Island", functionName: "spacingRockIslands" },
    { title: "Rocky Shore", functionName: "spacingRockyShores" },
    { title: "Beach", functionName: "spacingBeaches" },
    { title: "Eelgrass", functionName: "spacingEelgrass" },
  ];

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
    <>
      <Card title={data.title + " Spacing Report"}>
        {data.replicateIds.length !== 0 && (
          <>
            <SpacingObjectives data={data} />
            <ReplicateMap
              sketch={data.sketch}
              replicateIds={data.replicateIds}
              paths={data.paths}
            />
          </>
        )}
        {spacingReports.map((report) => (
          <p key={report.title}>
            <ResultsCard
              title={report.title}
              useChildCard
              skeleton={
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  {report.title} <Skeleton style={{ width: "50%" }} />
                </div>
              }
              functionName={report.functionName}
            >
              {(data: {
                sketch: Sketch<Polygon>[];
                replicateIds: string[];
                paths: any;
              }) => {
                return (
                  <ReportError>
                    <>
                      <Pill>{data.replicateIds.length}</Pill> {report.title}{" "}
                      habitat replicate(s).
                      {data.replicateIds.length !== 0 && (
                        <SimpleButton
                          onClick={() =>
                            setData({ ...data, title: report.title })
                          }
                        >
                          Show on Map
                        </SimpleButton>
                      )}
                    </>
                  </ReportError>
                );
              }}
            </ResultsCard>
          </p>
        ))}
      </Card>
    </>
  );
};

export default ReportPage;
