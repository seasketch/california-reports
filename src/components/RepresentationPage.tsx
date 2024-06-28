import React from "react";
import { KelpMax } from "./KelpMax.js";
import { RockIslands } from "./RockIslands.js";
import { Shoretypes } from "./Shoretypes.js";
import { Habitat } from "./Habitat.js";
import { Estuaries } from "./Estuaries.js";
import { Substrate } from "./Substrate.js";
import { Eelgrass } from "./Eelgrass.js";
import { KelpPersist } from "./KelpPersist.js";

const ReportPage = () => {
  return (
    <>
      <KelpMax />
      <KelpPersist />
      <RockIslands />
      <Shoretypes />
      <Habitat />
      <Estuaries />
      <Eelgrass />
      <Substrate />
    </>
  );
};

export default ReportPage;
