import React from "react";
import { KelpMax } from "./KelpMax.js";
import { RockIslands } from "./RockIslands.js";
import { Shoretypes } from "./Shoretypes.js";
import { Habitat } from "./Habitat.js";
import { Estuaries } from "./Estuaries.js";
import { Substrate } from "./Substrate.js";

const ReportPage = () => {
  return (
    <>
      <KelpMax />
      <RockIslands />
      <Shoretypes />
      <Habitat />
      <Estuaries />
      <Substrate />
    </>
  );
};

export default ReportPage;
