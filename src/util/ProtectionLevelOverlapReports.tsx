import React from "react";
import {
  ReportChartFigure,
  Column,
  GroupPill,
  Table,
  GroupCircleRow,
  ObjectiveStatus,
  Tooltip,
} from "@seasketch/geoprocessing/client-ui";
import {
  Metric,
  MetricGroup,
  GroupMetricAgg,
  firstMatchingMetric,
  percentWithEdge,
  OBJECTIVE_YES,
  OBJECTIVE_NO,
  Objective,
  ObjectiveAnswer,
  squareMeterToMile,
  roundDecimal,
} from "@seasketch/geoprocessing/client-core";
import { groupColorMapTransparent, groupColors, groups } from "./getGroup.js";
import { InfoCircleFill } from "@styled-icons/bootstrap";
import project from "../../project/index.js";
import { HorizontalStackedBar, RowConfig } from "./HorizontalStackedBar.js";
import { flattenByGroup } from "./flattenByGroup.js";
import { AreaSketchTableStyled } from "./genSketchTable.js";

export interface ClassTableGroupedProps {
  showDetailedObjectives?: boolean;
  showLegend?: boolean;
  showLayerToggles?: boolean;
  showTargetPass?: boolean;
}

const Number = new Intl.NumberFormat("en", { style: "decimal" });

/**
 * Creates grouped overlap report for sketch
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const groupedSketchReport = (
  metrics: Metric[],
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps,
) => {
  // Get total precalc areas
  const totalAreas = metricGroup.classes.reduce<Record<string, number>>(
    (acc, curClass) => {
      return {
        ...acc,
        [curClass.classId]: firstMatchingMetric(
          precalcMetrics,
          (m) => m.groupId === null && m.classId === curClass.classId,
        ).value,
      };
    },
    {},
  );

  // Filter down to metrics which have groupIds
  const levelMetrics = metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId),
  );

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const classMetrics = levelMetrics.filter(
        (m) => m.classId === curClass.classId,
      );
      const objective = curClass.objectiveId;
      const percValues = objective
        ? classMetrics
            .filter((levelAgg) => {
              const level = levelAgg.groupId;
              return (
                project.getObjectiveById(objective).countsToward[level!] ===
                OBJECTIVE_YES
              );
            })
            .map((yesAgg) => yesAgg.value / totalAreas[curClass.classId])
        : classMetrics.map(
            (group) => group.value / totalAreas[curClass.classId],
          );
      const values = classMetrics.map((group) => group.value);

      return {
        ...acc,
        [curClass.classId + "Perc"]: percValues,
        [curClass.classId]: values,
      };
    },
    {},
  );

  return genClassTableGrouped(metricGroup, totalsByClass, t, options);
};

/**
 * Creates grouped overlap report for sketch collection
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const groupedCollectionReport = (
  sketchId: string,
  metrics: Metric[],
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps,
) => {
  // Filter down to metrics which have groupIds
  const levelMetrics = metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId),
  );

  const groupLevelAggs: GroupMetricAgg[] = flattenByGroup(
    sketchId,
    levelMetrics,
    precalcMetrics,
  );

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const objective = curClass.objectiveId;
      const percValues = objective
        ? groupLevelAggs
            .filter((levelAgg) => {
              const level = levelAgg.groupId;
              return (
                project.getObjectiveById(objective).countsToward[level!] ===
                OBJECTIVE_YES
              );
            })
            .map((yesAgg) => yesAgg[curClass.classId + "Perc"] as number)
        : groupLevelAggs.map(
            (group) => group[curClass.classId + "Perc"] as number,
          );
      const values = objective
        ? groupLevelAggs
            .filter((levelAgg) => {
              const level = levelAgg.groupId;
              return (
                project.getObjectiveById(objective).countsToward[level!] ===
                OBJECTIVE_YES
              );
            })
            .map((yesAgg) => yesAgg[curClass.classId] as number)
        : groupLevelAggs.map((group) => group[curClass.classId] as number);

      return {
        ...acc,
        [curClass.classId + "Perc"]: percValues,
        [curClass.classId]: values,
      };
    },
    {},
  );

  return <>{genClassTableGrouped(metricGroup, totalsByClass, t, options)}</>;
};

/**
 * Creates grouped overlap report for sketch collection
 * @param metricGroup metric group to get stats for
 * @param totalsByClass percent overlap for each class for each protection level
 * @param t TFunction
 */
export const genClassTableGrouped = (
  metricGroup: MetricGroup,
  totalsByClass: Record<string, number[]>,
  t: any,
  options?: ClassTableGroupedProps,
) => {
  const finalOptions = {
    showDetailedObjectives: true,
    showLegend: true,
    showLayerToggles: true,
    showTargetPass: false,
    ...options,
  };
  // Coloring and styling for horizontal bars;

  // Display values for groups
  const groupDisplayMapSg: Record<string, string> = {
    SMR: t("State Marine Reserve"),
    SMCANT: t("State Marine Conservation Area (No-Take)"),
    SMCA: t("State Marine Conservation Area"),
    SMRMA: t("State Marine Recreation Management Area"),
    SMP: t("State Marine Park"),
    Special: t("Special Closure"),
  };

  /* i18next-extract-disable-next-line */
  const blockGroupNames = groups.map((level) => t(groupDisplayMapSg[level]));
  const blockGroupStyles = groupColors.map((curBlue) => ({
    backgroundColor: curBlue,
  }));

  const valueFormatter = (value: number) => {
    return roundDecimal(squareMeterToMile(value), 2) + " mi²";
  };
  const percValueFormatter = (value: number) => {
    if (isNaN(value)) {
      const tooltipText =
        "This feature is not present in the selected planning area";
      return (
        <Tooltip
          text={tooltipText}
          offset={{ horizontal: 0, vertical: 5 }}
          placement="bottom"
        >
          <InfoCircleFill
            size={14}
            style={{
              color: "#83C6E6",
            }}
          />
        </Tooltip>
      );
    }
    return percentWithEdge(value / 100);
  };

  const rowConfig: RowConfig[] = [];
  metricGroup.classes.forEach((curClass) => {
    rowConfig.push({
      title: curClass.display,
      layerId: curClass.layerId || "",
    });
  });

  const config = {
    rows: metricGroup.classes.map((curClass) =>
      totalsByClass[curClass.classId + "Perc"].map((value) => [value * 100]),
    ),
    values: metricGroup.classes.map((curClass) =>
      totalsByClass[curClass.classId].map((value) => [value]),
    ),
    target: metricGroup.classes.map((curClass) =>
      curClass.objectiveId
        ? project.getObjectiveById(curClass.objectiveId).target * 100
        : undefined,
    ),
    rowConfigs: rowConfig,
    max: 100,
  };

  const targetLabel = t("Target");

  return (
    <>
      {finalOptions.showDetailedObjectives &&
        metricGroup.classes.map((curClass) => {
          if (curClass.objectiveId) {
            const objective = project.getObjectiveById(curClass.objectiveId);

            // Get total percentage within sketch
            const percSum = totalsByClass[curClass.classId].reduce(
              (sum, value) => sum + value,
              0,
            );

            // Checks if the objective is met
            const isMet =
              percSum >= objective.target ? OBJECTIVE_YES : OBJECTIVE_NO;

            return (
              <React.Fragment key={objective.objectiveId}>
                <CollectionObjectiveStatus
                  objective={objective}
                  objectiveMet={isMet}
                  t={t}
                  renderMsg={
                    Object.keys(collectionMsgs).includes(objective.objectiveId)
                      ? collectionMsgs[objective.objectiveId](
                          objective,
                          isMet,
                          t,
                        )
                      : collectionMsgs["default"](objective, isMet, t)
                  }
                />
              </React.Fragment>
            );
          }
        })}
      <ReportChartFigure>
        <HorizontalStackedBar
          {...config}
          blockGroupNames={blockGroupNames}
          blockGroupStyles={blockGroupStyles}
          percValueFormatter={percValueFormatter}
          valueFormatter={valueFormatter}
          targetValueFormatter={(value) => targetLabel + ` - ` + value + `%`}
          showLayerToggles={finalOptions.showLayerToggles}
          showLegend={finalOptions.showLegend}
          showTargetPass={finalOptions.showTargetPass}
        />
      </ReportChartFigure>
    </>
  );
};

/**
 * Properties for getting objective status for sketch collection
 * @param objective Objective
 * @param objectiveMet ObjectiveAnswer
 * @param renderMsg function that takes (objective, groupId)
 */
export interface CollectionObjectiveStatusProps {
  objective: Objective;
  objectiveMet: ObjectiveAnswer;
  t: any;
  renderMsg: any;
}

/**
 * Presents objectives for single sketch
 * @param CollectionObjectiveStatusProps containing objective, objective
 */
export const CollectionObjectiveStatus: React.FunctionComponent<
  CollectionObjectiveStatusProps
> = ({ objective, objectiveMet, t }) => {
  const msg = Object.keys(collectionMsgs).includes(objective.objectiveId)
    ? collectionMsgs[objective.objectiveId](objective, objectiveMet, t)
    : collectionMsgs["default"](objective, objectiveMet, t);

  return <ObjectiveStatus status={objectiveMet} msg={msg} />;
};

/**
 * Renders messages beased on objective and if objective is met for sketch collections
 */
export const collectionMsgs: Record<string, any> = {
  default: (objective: Objective, objectiveMet: ObjectiveAnswer, t: any) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {/* i18next-extract-disable-line */ t(objective.shortDesc)}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>
          {/* i18next-extract-disable-line */ t(objective.shortDesc)}
        </>
      );
    }
  },
  ocean_space_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    t: any,
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space.")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space.")}
        </>
      );
    }
  },
  ocean_space_highly_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    t: any,
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space in High Protection Biodiversity Zones")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b>{" "}
          {t("of the Belize Ocean Space in High Protection Biodiversity Zones")}
        </>
      );
    }
  },
};

/**
 * Creates "Show by Protection Level" report with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genAreaGroupLevelTable = (
  sketchId: string,
  metrics: Metric[],
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
) => {
  // Filter down to metrics which have groupIds
  const levelMetrics = metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId),
  );

  const levelAggs: GroupMetricAgg[] = flattenByGroup(
    sketchId,
    levelMetrics,
    precalcMetrics,
  );

  const classColumns: Column<Record<string, string | number>>[] =
    metricGroup.classes.map((curClass, index) => {
      return {
        Header: " ",
        style: { color: "#777" },
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value = row[curClass.classId] as number;
              const miVal = squareMeterToMile(value);

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                miVal && miVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(miVal, 2));
              return (
                <GroupPill
                  groupColorMap={groupColorMapTransparent}
                  group={row.groupId.toString()}
                >
                  {valDisplay + " " + t("mi²")}
                </GroupPill>
              );
            },
          },
          {
            Header: t("% State Waters") + " ".repeat(index),
            accessor: (row) => (
              <GroupPill
                groupColorMap={groupColorMapTransparent}
                group={row.groupId.toString()}
              >
                {percentWithEdge(
                  isNaN(row[curClass.classId + "Perc"] as number)
                    ? 0
                    : (row[curClass.classId + "Perc"] as number),
                )}
              </GroupPill>
            ),
          },
        ],
      };
    });

  const groupDisplayMapPl: Record<string, string> = {
    SMR: t("State Marine Reserve(s)"),
    SMCANT: t("State Marine Conservation Area(s) (No-Take)"),
    SMCA: t("State Marine Conservation Area(s)"),
    SMRMA: t("State Marine Recreation Management Area(s)"),
    SMP: t("State Marine Park(s)"),
    Special: t("Special Closure(s)"),
  };

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: t("This plan contains") + ":",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId.toString()}
          groupColorMap={groupColorMapTransparent}
          circleText={`${row.numSketches}`}
          rowText={
            /* i18next-extract-disable-line */ t(groupDisplayMapPl[row.groupId])
          }
        />
      ),
    },
    ...classColumns,
  ];

  // If not printing, return a single table
  return (
    <AreaSketchTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={levelAggs.sort(
          (a, b) =>
            groups.indexOf(a.groupId || "") - groups.indexOf(b.groupId || ""),
        )}
      />
    </AreaSketchTableStyled>
  );
};
