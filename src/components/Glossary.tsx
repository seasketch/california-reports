import React from "react";
import { Card } from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";

export const Glossary = () => {
  const { t } = useTranslation();

  return (
    <>
      <Card title={t("Glossary")}>
        <p>
          <b>Baseline/Shoreline:</b> For California, the shoreward boundary is
          the mean high tide line.
        </p>
        <p>
          <b>State waters:</b> Generally zero to three nautical miles off the
          mainland coast and around offshore islands, and within bays and
          estuaries.
        </p>
      </Card>
    </>
  );
};
