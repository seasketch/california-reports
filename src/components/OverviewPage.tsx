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
        <b>Adaptive management</b>: A management policy that seeks to improve
        management of biological resources, particularly in areas of scientific
        uncertainty, by viewing program actions as tools for learning. Actions
        shall be designed so that, even if they fail, they will provide useful
        information for future actions, and monitoring and evaluation shall be
        emphasized so that the interaction of different elements within marine
        systems may be better understood. [FGC 2852(a)]
      </p>
      <p>
        <b>Baseline/Shoreline</b>: For California's MPAs, the shoreward boundary
        is the mean high tide line.
      </p>
      <p>
        <b>Bioregions:</b>: Refers to the following oceanic or near shore areas,
        seaward from the mean high tide line or the mouth of coastal rivers,
        with distinctive biological characteristics, unless the master plan team
        establishes an alternative set of boundaries: (1) The area extending
        south from Point Conception. (2) The area between Point Conception and
        Point Arena. (3) The area extending north from Point Arena. [FGC
        2852(b)]
      </p>
      <p>
        <b>Deep</b>: Greater than 100 meters (330 feet)
      </p>
      <p>
        <b>Habitat</b>: The environment in which an organism or community lives,
        characterized by its physical or biotic properties.
      </p>
      <p>
        <b>Marine Protected Area (MPA)</b>: A named, discrete geographic marine
        or estuarine area seaward of the mean high tide line or the mouth of a
        coastal river, including any area of intertidal or subtidal terrain,
        together with its overlying water and associated flora and fauna that
        has been designated by law, administrative action, or voter initiative
        to protect or conserve marine life and habitat. [FGC 2852(c)]
      </p>
      <p>
        <b>Petitions</b>: Mode by which a person or agency can recommend to the
        California Fish and Game Commission that a regulation be added, amended,
        or repealed.
      </p>
      <p>
        <b>Planning/Study Regions</b>: Coastal regions along the state's
        1100-mile coast in which MPAs were designed and implemented in a
        stepwise fashion: (1) Central Coast Study Region, Pigeon Point to Point
        Conception, (2) North Central Coast Study Region, Alder Creek near Point
        Arena to Pigeon Point, including the Farallon Islands, (3) South Coast
        Study Region, Point Conception to California/Mexico border, (4) North
        Coast Study Region, California/Oregon border to Alder Creek near Point
        Arena.
      </p>
      <p>
        <b>Shallow</b>: 100 meters (330 feet) or less
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
        <b>State Waters</b>: Generally zero to three nautical miles off the
        mainland coast and around offshore islands, and within bays and
        estuaries.
      </p>
    </>
  );
};

export default ReportPage;
