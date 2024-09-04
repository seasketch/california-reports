import React from "react";
import { SizeCard } from "./SizeCard.js";
import { Card, Collapse, InfoStatus } from "@seasketch/geoprocessing/client-ui";
import { ClassificationCard } from "./Classification.js";
import SketchAttributesCard from "./SketchAttributesCard.js";
import { useTranslation } from "react-i18next";

const ReportPage = () => {
  const { t } = useTranslation();
  return (
    <>
      <Card>
        <InfoStatus
          msg={
            <>
              SeaSketch is a real-time sketch evaluation tool. Analyses are
              often conducted on <b>simplified</b> data. Final metrics must be
              calculated using desktop GIS software.
            </>
          }
        />
        <Collapse title={t("Glossary")} key={"Glossary"}>
          <p>
            <b>Baseline/Shoreline:</b> For California, the shoreward boundary is
            the mean high tide line.
          </p>
          <p>
            <b>State waters:</b> Generally zero to three nautical miles off the
            mainland coast and around offshore islands, and within bays and
            estuaries.
          </p>
          <p>
            <b>Adaptive management</b>: an approach that seeks to improve
            management by viewing program actions as tools for learning. Actions
            are designed such that, even if they fail, they provide useful
            information for future actions
          </p>
        </Collapse>
      </Card>
      <ClassificationCard />
      <SizeCard />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
