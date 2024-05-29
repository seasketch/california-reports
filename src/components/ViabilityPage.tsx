import React from "react";
import { SizeCard } from "./SizeCard.js";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { Regions } from "./Regions.js";
import { Bioregions } from "./Bioregions.js";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <Regions />
      <Bioregions />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
