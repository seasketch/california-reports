import React, { useState } from "react";
import { ReportPage, SegmentControl } from "@seasketch/geoprocessing/client-ui";
import OverviewPage from "../components/OverviewPage.js";
import RepresentationPage from "../components/RepresentationPage.js";
import SpacingPage from "../components/SpacingPage.js";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";

const enableAllTabs = false;

const BaseReport = () => {
  const { t } = useTranslation();
  const overviewId = "overview";
  const representationId = "representation";
  const spacingId = "spacing";
  const segments = [
    { id: overviewId, label: t("Overview") },
    { id: representationId, label: t("Habitat Replication") },
    { id: spacingId, label: t("Habitat Spacing") },
  ];
  const [tab, setTab] = useState<string>(overviewId);
  return (
    <div>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== overviewId}>
        <OverviewPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== representationId}>
        <RepresentationPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== spacingId}>
        <SpacingPage />
      </ReportPage>
    </div>
  );
};

// Named export loaded by storybook
export const MpaTabReport = () => {
  // Translator must be in parent FunctionComponent in order for ReportClient to use useTranslate hook
  return (
    <Translator>
      <BaseReport />
    </Translator>
  );
};

// Default export lazy-loaded by top-level ReportApp
export default MpaTabReport;
