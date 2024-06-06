import React from "react";
import { Kelp } from "./Kelp.js";
import { KelpMax } from "./KelpMax.js";
import { RockIslands } from "./RockIslands.js";
import { Shoretypes } from "./Shoretypes.js";

const ReportPage = () => {
  return (
    <>
      <KelpMax />
      <Kelp />
      <RockIslands />
      <Shoretypes />
    </>
  );
};

export default ReportPage;
