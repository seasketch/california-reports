import React from "react";
import { SizeCard } from "./SizeCard.js";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { Regions } from "./Regions.js";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <Regions />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
