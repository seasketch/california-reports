import React from "react";
import { SizeCard } from "./SizeCard.js";
import { Card, InfoStatus } from "@seasketch/geoprocessing/client-ui";
import { ClassificationCard } from "./Classification.js";
import { Glossary } from "./Glossary.js";
import SketchAttributesCard from "./SketchAttributesCard.js";

const ReportPage = () => {
  return (
    <>
      <Card>
        <InfoStatus
          msg={
            <>
              SeaSketch is a real-time sketch evaluation tool. Analyses are
              often conducted on <b>simplified</b> data. Final metrics must be
              calculated using desktop GIS software.
            </>
          }
        />
      </Card>
      <Glossary />
      <ClassificationCard />
      <SizeCard />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
