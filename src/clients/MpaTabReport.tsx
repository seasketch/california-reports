import React, { useState } from "react";
import { SegmentControl, ReportPage } from "@seasketch/geoprocessing/client-ui";
import SpacingPage from "../components/SpacingPage.js";
import OverviewPage from "../components/OverviewPage.js";
import RepresentationPage from "../components/RepresentationPage.js";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync.js";

const enableAllTabs = false;

const BaseReport = () => {
  const { t } = useTranslation();
  const spacingId = "spacing";
  const overviewId = "overview";
  const representationId = "representation";
  const segments = [
    { id: spacingId, label: t("Spacing") },
    { id: overviewId, label: t("Overview") },
    { id: representationId, label: t("Representation") },
  ];
  const [tab, setTab] = useState<string>(spacingId);
  return (
    <div>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== spacingId}>
        <SpacingPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== overviewId}>
        <OverviewPage />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== representationId}>
        <RepresentationPage />
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
