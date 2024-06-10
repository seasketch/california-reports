import React from "react";
import { Kelp } from "./Kelp.js";
import { KelpMax } from "./KelpMax.js";
import { RockIslands } from "./RockIslands.js";
import { Shoretypes } from "./Shoretypes.js";
import { Habitat } from "./Habitat.js";

const ReportPage = () => {
  return (
    <>
      <KelpMax />
      <Kelp />
      <RockIslands />
      <Shoretypes />
      <Habitat />
    </>
  );
};

export default ReportPage;
