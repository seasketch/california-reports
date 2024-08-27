import React from "react";
import { KelpMax } from "./KelpMax.js";
import { Shoretypes } from "./Shoretypes.js";
import { Estuaries } from "./Estuaries.js";
import { Substrate } from "./Substrate.js";
import { Eelgrass } from "./Eelgrass.js";
import { KelpPersist } from "./KelpPersist.js";
import { Depth } from "./Depth.js";

const ReportPage = () => {
  return (
    <>
      <Depth />
      <KelpMax />
      <KelpPersist />
      <Shoretypes />
      <Estuaries />
      <Eelgrass />
      <Substrate />
    </>
  );
};

export default ReportPage;
