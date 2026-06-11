import React, { useState } from "react";
import { SegmentControl } from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";
import { KelpForest } from "../components/KelpForest.js";
import { Ccfrp } from "../components/Ccfrp.js";

const BaseReport = () => {
  const { t } = useTranslation();
  const kelpForestId = "kelpForest";
  const nearshoreFisheriesId = "nearshoreFisheries";
  const [tab, setTab] = useState<string>(kelpForestId);
  const segments = [
    { id: kelpForestId, label: t("Kelp Forest") },
    { id: nearshoreFisheriesId, label: t("Nearshore Fisheries") },
  ];

  return (
    <>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>

      {tab === kelpForestId && <KelpForest />}
      {tab === nearshoreFisheriesId && <Ccfrp />}
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
