import React from "react";
import { SizeCard } from "./SizeCard.js";
import { Card, Collapse, InfoStatus } from "@seasketch/geoprocessing/client-ui";
import { ClassificationCard } from "./Classification.js";
import SketchAttributesCard from "./SketchAttributesCard.js";
import { useTranslation } from "react-i18next";
import { Span } from "./Span.js";

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
          <Glossary />
        </Collapse>
      </Card>
      <ClassificationCard />
      <SizeCard />
      <Span />
      <SketchAttributesCard autoHide />
    </>
  );
};

const Glossary = () => {
  return (
    <>
      <p>
        <b>Adaptive management</b>: an approach that seeks to improve management
        by viewing program actions as tools for learning. Actions are designed
        such that, even if they fail, they provide useful information for future
        actions
      </p>
      <p>
        <b>Baseline/Shoreline:</b> For California, the shoreward boundary is the
        mean high tide line.
      </p>
      <p>
        <b>Special Closure</b>: A special closure is an area designated by the
        Fish and Game Commission that prohibits access or restricts boating
        activities in waters adjacent to sea bird rookeries or marine mammal
        haul-out sites.
      </p>
      <p>
        <b>State Marine Conservation Area</b>: In a state marine conservation
        area, it is unlawful to injure, damage, take, or possess any living,
        geological, or cultural marine resource for commercial or recreational
        purposes, or a combination of commercial and recreational purposes
        except as specified in subsection 632(b), areas and special regulations
        for use. The department may issue scientific collecting permits pursuant
        to Section 650. The commission may authorize research, education, and
        recreational activities, and certain commercial and recreational harvest
        of marine resources, provided that these uses do not compromise
        protection of the species of interest, natural community, habitat, or
        geological features.
      </p>
      <p>
        <b>State Marine Recreational Management Area</b>: In a state marine
        recreational management area, it is unlawful to perform any activity
        that would compromise the recreational values for which the area may be
        designated. Recreational opportunities may be protected, enhanced, or
        restricted, while preserving basic resource values of the area. No other
        use is restricted unless specified in subsection 632(b), areas and
        special regulations for use.
      </p>
      <p>
        <b>State Marine Reserve</b>: In a state marine reserve, it is unlawful
        to injure, damage, take, or possess any living, geological, or cultural
        marine resource, except under a scientific collecting permit issued by
        the department pursuant to Section 650 or specific authorization from
        the commission for research, restoration, or monitoring purposes.
      </p>
      <p>
        <b>State Marine Park</b>: In a state marine park, it is unlawful to
        injure, damage, take, or possess any living or nonliving marine resource
        for commercial purposes. Any human use that would compromise protection
        of the species of interest, natural community or habitat, or geological,
        cultural, or recreational features, may be restricted by the commission
        as specified in subsection 632(b), areas and special regulations for
        use. The department may issue scientific collecting permits pursuant to
        Section 650. The commission may authorize research, monitoring, and
        educational activities and certain recreational harvest in a manner
        consistent with protecting resource values.
      </p>
      <p>
        <b>State waters:</b> Generally zero to three nautical miles off the
        mainland coast and around offshore islands, and within bays and
        estuaries.
      </p>
    </>
  );
};

export default ReportPage;
