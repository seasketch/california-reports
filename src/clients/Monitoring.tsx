import React, { useState } from "react";
import { ReportPage, SegmentControl } from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";
import { KelpForest } from "../components/KelpForest.js";
import { KelpForestOverview } from "../components/KelpForestOverview.js";
import { CcfrpOverview } from "../components/CcfrpOverview.js";
import { IntertidalOverview } from "../components/IntertidalOverview.js";
import { Ccfrp } from "../components/Ccfrp.js";
import { Intertidal } from "../components/Intertidal.js";

const BaseReport = () => {
  const { t } = useTranslation();
  const overviewId = "overview";
  const kelpForestId = "kelpForest";
  const nearshoreFisheriesId = "nearshoreFisheries";
  const intertidalId = "intertidal";
  const [tab, setTab] = useState<string>(overviewId);
  const segments = [
    { id: overviewId, label: t("Overview") },
    { id: kelpForestId, label: t("Kelp Forest") },
    { id: nearshoreFisheriesId, label: t("Fisheries") },
    { id: intertidalId, label: t("Rocky Intertidal") },
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

      <ReportPage hidden={tab !== overviewId}>
        <KelpForestOverview />
        <CcfrpOverview />
        <IntertidalOverview />
      </ReportPage>
      <ReportPage hidden={tab !== kelpForestId}>
        <KelpForest />
      </ReportPage>
      <ReportPage hidden={tab !== nearshoreFisheriesId}>
        <Ccfrp />
      </ReportPage>
      <ReportPage hidden={tab !== intertidalId}>
        <Intertidal />
      </ReportPage>
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
