import React from "react";
import { Kelp } from "./Kelp.js";
import { Shoretypes } from "./Shoretypes.js";
import { Estuaries } from "./Estuaries.js";
import { Eelgrass } from "./Eelgrass.js";
import { Depth } from "./Depth.js";
import { Habitat } from "./Habitat.js";
import { HabitatNearshore } from "./HabitatNearshoreCard.js";

const ReportPage = () => {
  return (
    <>
      <Depth />
      <Kelp />
      <Shoretypes />
      <Estuaries />
      <Eelgrass />
      <Habitat />
      <HabitatNearshore />
    </>
  );
};

export default ReportPage;
