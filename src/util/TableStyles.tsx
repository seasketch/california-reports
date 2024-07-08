import { ReportTableStyled } from "@seasketch/geoprocessing/client-ui";
import styled from "styled-components";

export const PercentSketchTableStyled = styled(ReportTableStyled)`
  & {
    width: 100%;
    overflow-x: scroll;
    font-size: 12px;
  }

  & td,
  th {
    text-align: center;
    min-width: 40px;
  }

  td:not(:last-child),
  th:not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:not(:first-child) {
    white-space: nowrap;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }
`;

interface AreaSketchTableProps {
  printing: boolean;
}

export const AreaSketchTableStyled = styled(
  ReportTableStyled
)<AreaSketchTableProps>`
  & {
    width: 100%;
    overflow-x: ${(props) => (props.printing ? "visible" : "scroll")};
    font-size: 12px;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }

  th,
  tr,
  td {
    text-align: center;
  }

  td:not(:first-child),
  th {
    white-space: nowrap;
  }

  tr:nth-child(1) > th:not(:last-child) {
    border-right: 2px solid #efefef;
  }

  tr:nth-child(2) > th:nth-child(2n-1):not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:nth-child(2n-1):not(:last-child) {
    border-right: 2px solid #efefef;
  }
`;
