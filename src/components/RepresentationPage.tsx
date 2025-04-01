import React from "react";
import { Kelp } from "./Kelp.js";
import { Shoretypes } from "./Shoretypes.js";
import { Estuaries } from "./Estuaries.js";
import { Eelgrass } from "./Eelgrass.js";
import { Depth } from "./Depth.js";
import { Habitat } from "./Habitat.js";
import { HabitatNearshore } from "./HabitatNearshoreCard.js";

const ReportPage: React.FunctionComponent<{ printing: boolean }> = (props) => {
  return (
    <>
      <Depth printing={props.printing} />
      <Kelp printing={props.printing} />
      <Shoretypes printing={props.printing} />
      <Estuaries printing={props.printing} />
      <Eelgrass printing={props.printing} />
      <Habitat printing={props.printing} />
      <HabitatNearshore printing={props.printing} />
    </>
  );
};

export default ReportPage;
