import React from "react";
import { SizeCard } from "./SizeCard.js";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { Regions } from "./Regions.js";
import { Bioregions } from "./Bioregions.js";
import { ProtectionCard } from "./Protection.js";

const ReportPage = () => {
  return (
    <>
      <ProtectionCard />
      <SizeCard />
      <Regions />
      <Bioregions />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
