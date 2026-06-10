import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  ReportPage,
  SegmentControl,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import OverviewPage from "../components/OverviewPage.js";
import RepresentationPage from "../components/RepresentationPage.js";
import SpacingPage from "../components/SpacingPage.js";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";
import { Printer } from "@styled-icons/bootstrap";
import { useReactToPrint } from "react-to-print";
import SketchAttributesCard from "../components/SketchAttributesCard.js";
import { SketchProperties } from "@seasketch/geoprocessing";
import { KelpForest } from "../components/KelpForest.js";

const BaseReport = () => {
  return (
    <>
      <KelpForest />
    </>
  );
};

// Named export loaded by storybook
export const Monitoring = () => {
  // Translator must be in parent FunctionComponent in order for ReportClient to use useTranslate hook
  return (
    <Translator>
      <BaseReport />
    </Translator>
  );
};

// Default export lazy-loaded by top-level ReportApp
export default Monitoring;
