import { CircleProps, StyledCircle } from "@seasketch/geoprocessing/client-ui";
import React from "react";
import { styled } from "styled-components";

const StyledClassCircle = styled(StyledCircle)`
  border: ${(props) => `3px solid ${props.color}`};
  border-top-left-radius: ${(props) =>
    props.size ? `${props.size}px` : "17px"};
  border-top-right-radius: 0;
  border-bottom-left-radius: ${(props) =>
    props.size ? `${props.size}px` : "17px"};
  border-bottom-right-radius: ${(props) =>
    props.size ? `${props.size}px` : "17px"};
  box-shadow: 1px 1px 3px 2px rgba(0, 0, 0, 0.15);
  color: #555;
  background-color: white;
  font-weight: bold;
`;

/** Circle with pointy top right corner */
export const PointyCircle: React.FunctionComponent<CircleProps> = ({
  children,
  color,
  size,
}) => {
  return (
    <StyledClassCircle color={color} size={size}>
      {children}
    </StyledClassCircle>
  );
};
