import React from "react";
import { KelpMax } from "./KelpMax.js";
import { Shoretypes } from "./Shoretypes.js";
import { Estuaries } from "./Estuaries.js";
import { Eelgrass } from "./Eelgrass.js";
import { KelpPersist } from "./KelpPersist.js";
import { Depth } from "./Depth.js";
import { Habitat } from "./Habitat.js";

const ReportPage = () => {
  return (
    <>
      <Depth />
      <KelpMax />
      <KelpPersist />
      <Shoretypes />
      <Estuaries />
      <Eelgrass />
      <Habitat />
    </>
  );
};

export default ReportPage;
