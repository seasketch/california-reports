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
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  Metric,
  MetricGroup,
  toPercentMetric,
  GroupMetricAgg,
  firstMatchingMetric,
  flattenByGroupAllClass,
  isSketchCollection,
  percentWithEdge,
  OBJECTIVE_YES,
  OBJECTIVE_NO,
  Objective,
  ObjectiveAnswer,
  keyBy,
  nestMetrics,
  squareMeterToMile,
  roundDecimal,
} from "@seasketch/geoprocessing/client-core";
import {
  groupColorMap,
  groupDisplayMapPl,
  groups,
  groupsDisplay,
} from "./getGroup.js";
import { InfoCircleFill } from "@styled-icons/bootstrap";
import project from "../../project/index.js";
import { HorizontalStackedBar, RowConfig } from "./HorizontalStackedBar.js";
import { flattenByGroup } from "./flattenByGroup.js";
import {
  AreaSketchTableStyled,
  PercentSketchTableStyled,
} from "./TableStyles.js";

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
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps
) => {
  // Get total precalc areas
  const totalAreas = metricGroup.classes.reduce<Record<string, number>>(
    (acc, curClass) => {
      return {
        ...acc,
        [curClass.classId]: firstMatchingMetric(
          precalcMetrics,
          (m) => m.groupId === null && m.classId === curClass.classId
        ).value,
      };
    },
    {}
  );

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId)
  );

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const classMetrics = levelMetrics.filter(
        (m) => m.classId === curClass.classId
      );
      const objective = curClass.objectiveId;
      const values = objective
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
            (group) => group.value / totalAreas[curClass.classId]
          );

      return { ...acc, [curClass.classId]: values };
    },
    {}
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
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  options?: ClassTableGroupedProps
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId)
  );

  const groupLevelAggs: GroupMetricAgg[] = flattenByGroupAllClass(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  // Filter down grouped metrics to ones that count for each class
  const totalsByClass = metricGroup.classes.reduce<Record<string, number[]>>(
    (acc, curClass) => {
      const objective = curClass.objectiveId;
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

      return { ...acc, [curClass.classId]: values };
    },
    {}
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
  options?: ClassTableGroupedProps
) => {
  const finalOptions = {
    showDetailedObjectives: true,
    showLegend: true,
    showLayerToggles: true,
    showTargetPass: false,
    ...options,
  };
  // Coloring and styling for horizontal bars
  const groupColors = Object.values(groupColorMap);
  const blockGroupNames = groupsDisplay.map((level) => t(level));
  const blockGroupStyles = groupColors.map((curBlue) => ({
    backgroundColor: curBlue,
  }));
  const valueFormatter = (value: number) => {
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
      totalsByClass[curClass.classId].map((value) => [value * 100])
    ),
    target: metricGroup.classes.map((curClass) =>
      curClass.objectiveId
        ? project.getObjectiveById(curClass.objectiveId).target * 100
        : undefined
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
              0
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
                          t
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
          <b>{percentWithEdge(objective.target)}</b> {t(objective.shortDesc)}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t(objective.shortDesc)}
        </>
      );
    }
  },
  ocean_space_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    t: any
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
    t: any
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
 * Creates "Show by Zone Type" report with percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genPercGroupLevelTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  printing: boolean = false
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId)
  );

  const levelAggs: GroupMetricAgg[] = flattenByGroup(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  const classColumns: Column<Record<string, string | number>>[] =
    metricGroup.classes.map((curClass) => ({
      Header: curClass.display,
      accessor: (row) => {
        return (
          <GroupPill
            groupColorMap={groupColorMap}
            group={row.groupId.toString()}
          >
            {percentWithEdge(
              isNaN(row[curClass.classId + "Perc"] as number)
                ? 0
                : (row[curClass.classId + "Perc"] as number)
            )}
          </GroupPill>
        );
      },
    }));

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: t("This plan contains") + ":",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId.toString()}
          groupColorMap={groupColorMap}
          circleText={`${row.numSketches}`}
          rowText={t(groupDisplayMapPl[row.groupId])}
        />
      ),
    },
    ...classColumns,
  ];
  return (
    <PercentSketchTableStyled printing={printing}>
      <Table
        className="styled"
        columns={columns}
        data={levelAggs.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </PercentSketchTableStyled>
  );
};

/**
 * Creates "Show by Protection Level" report with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genAreaGroupLevelTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  t: any,
  printing: boolean = false
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId && groups.includes(m.groupId)
  );

  const levelAggs: GroupMetricAgg[] = flattenByGroup(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  const classColumns: Column<Record<string, string | number>>[] =
    metricGroup.classes.map((curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);

      return {
        Header: transString,
        style: { color: "#777" },
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value = row[curClass.classId] as number;
              const kmVal = squareMeterToMile(value);

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                kmVal && kmVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(kmVal));
              return (
                <GroupPill
                  groupColorMap={groupColorMap}
                  group={row.groupId.toString()}
                >
                  {valDisplay + " " + t("km²")}
                </GroupPill>
              );
            },
          },
          {
            Header: t("% Area") + " ".repeat(index),
            accessor: (row) => (
              <GroupPill
                groupColorMap={groupColorMap}
                group={row.groupId.toString()}
              >
                {percentWithEdge(
                  isNaN(row[curClass.classId + "Perc"] as number)
                    ? 0
                    : (row[curClass.classId + "Perc"] as number)
                )}
              </GroupPill>
            ),
          },
        ],
      };
    });

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: t("This plan contains") + ":",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId.toString()}
          groupColorMap={groupColorMap}
          circleText={`${row.numSketches}`}
          rowText={t(groupDisplayMapPl[row.groupId])}
        />
      ),
    },
    ...classColumns,
  ];
  if (printing) {
    const tables: JSX.Element[] = [];
    const totalClasses = metricGroup.classes.length;
    const numTables = Math.ceil(totalClasses / 5);

    for (let i = 0; i < numTables; i++) {
      const startIndex = i * 5;
      const endIndex = Math.min((i + 1) * 5, totalClasses);

      const tableColumns: Column<Record<string, string | number>>[] = [
        columns[0], // "This plan contains" column
        ...classColumns.slice(startIndex, endIndex),
      ];

      tables.push(
        <AreaSketchTableStyled printing={printing} key={String(i)}>
          <Table
            className="styled"
            columns={tableColumns}
            data={levelAggs.sort((a, b) => a.groupId.localeCompare(b.groupId))}
            manualPagination={printing}
          />
        </AreaSketchTableStyled>
      );
    }

    return tables;
  }

  // If not printing, return a single table
  return (
    <AreaSketchTableStyled printing={printing}>
      <Table
        className="styled"
        columns={columns}
        data={levelAggs.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </AreaSketchTableStyled>
  );
};

/**
 * Creates "Show by Zone" report, with only percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  metricGroup: MetricGroup,
  printing: boolean = false
) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );

  const zoneLabel = "Zone";

  const classColumns: Column<Record<string, string | number>>[] =
    metricGroup.classes.map((curClass) => ({
      Header: curClass.display,
      accessor: (row) =>
        percentWithEdge(
          isNaN(row[curClass.classId] as number)
            ? 0
            : (row[curClass.classId] as number)
        ),
    }));

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: zoneLabel,
      accessor: (row) => row.sketchName,
    },
    ...classColumns,
  ];

  return (
    <PercentSketchTableStyled printing={printing}>
      <Table
        className="styled"
        columns={columns}
        data={sketchRows.sort((a, b) =>
          (a.sketchName as string).localeCompare(b.sketchName as string)
        )}
      />
    </PercentSketchTableStyled>
  );
};

/**
 * Creates "Show by Zone" report, with area + percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param metricGroup metric group to get stats for
 * @param t TFunction
 */
export const genAreaSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  t: any,
  printing: boolean = false
) => {
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);
  const sketchIds = sketches.map((sk) => sk.properties.id);
  const sketchMetrics = data.metrics.filter(
    (m) => m.sketchId && sketchIds.includes(m.sketchId)
  );
  const finalMetrics = [
    ...sketchMetrics,
    ...toPercentMetric(sketchMetrics, precalcMetrics, {
      metricIdOverride: project.getMetricGroupPercId(mg),
    }),
  ];

  const aggMetrics = nestMetrics(finalMetrics, [
    "sketchId",
    "classId",
    "metricId",
  ]);
  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((sketchId) => ({
    sketchId,
  }));

  const classColumns: Column<{ sketchId: string }>[] = mg.classes.map(
    (curClass, index) => {
      /* i18next-extract-disable-next-line */
      const transString = t(curClass.display);
      return {
        Header: transString,
        style: { color: "#777" },
        columns: [
          {
            Header: t("Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  mg.metricId
                ][0].value;
              const kmVal = squareMeterToMile(value);

              // If value is nonzero but would be rounded to zero, replace with < 0.1
              const valDisplay =
                kmVal && kmVal < 0.1
                  ? "< 0.1"
                  : Number.format(roundDecimal(kmVal));
              return valDisplay + " " + t("km²");
            },
          },
          {
            Header: t("% Area") + " ".repeat(index),
            accessor: (row) => {
              const value =
                aggMetrics[row.sketchId][curClass.classId as string][
                  project.getMetricGroupPercId(mg)
                ][0].value;
              return percentWithEdge(isNaN(value) ? 0 : value);
            },
          },
        ],
      };
    }
  );

  const columns: Column<any>[] = [
    {
      Header: "Zone",
      accessor: (row) => sketchesById[row.sketchId].properties.name,
    },
    ...classColumns,
  ];

  if (printing) {
    const tables: JSX.Element[] = [];
    const totalClasses = mg.classes.length;
    const numTables = Math.ceil(totalClasses / 5);

    for (let i = 0; i < numTables; i++) {
      const startIndex = i * 5;
      const endIndex = Math.min((i + 1) * 5, totalClasses);

      const tableColumns: Column<{ sketchId: string }>[] = [
        columns[0], // "This plan contains" column
        ...classColumns.slice(startIndex, endIndex),
      ];

      tables.push(
        <AreaSketchTableStyled printing={printing} key={String(i)}>
          <Table
            columns={tableColumns}
            data={rows}
            manualPagination={printing}
          />
        </AreaSketchTableStyled>
      );
    }

    return tables;
  }

  // If not printing, return a single table
  return (
    <AreaSketchTableStyled printing={printing}>
      <Table columns={columns} data={rows} />
    </AreaSketchTableStyled>
  );
};
