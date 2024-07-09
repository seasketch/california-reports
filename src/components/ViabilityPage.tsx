import React from "react";
import { SizeCard } from "./SizeCard.js";
import {
  Card,
  InfoStatus,
  SketchAttributesCard,
} from "@seasketch/geoprocessing/client-ui";
import { Regions } from "./Regions.js";
import { Bioregions } from "./Bioregions.js";
import { ProtectionCard } from "./Protection.js";

const ReportPage = () => {
  return (
    <>
      <Card>
        <InfoStatus
          msg={
            <>
              SeaSketch is a real-time sketch evaluation tool. Analyses are
              conducted on <b>simplified</b> data. Final statistics must be
              calculated on desktop GIS software.
            </>
          }
        />
      </Card>
      <ProtectionCard />
      <SizeCard />
      <Regions />
      <Bioregions />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
