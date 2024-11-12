import React, { useState } from "react";
import { Stack } from "@styled-icons/bootstrap";

// Dummy useVisibleLayers hook
function useVisibleLayers() {
  const [visibleLayers, setVisibleLayers] = useState<string[]>([]);

  const toggleLayer = (layerId: string) => {
    setVisibleLayers((prevLayers) =>
      prevLayers.includes(layerId)
        ? prevLayers.filter((id) => id !== layerId)
        : [...prevLayers, layerId],
    );
  };

  return [visibleLayers, toggleLayer] as const;
}

export function LayerToggle({
  layerId,
  label = "",
  style,
  simple,
  size = "regular",
}: {
  layerId?: string;
  label?: string;
  style?: React.CSSProperties;
  simple?: boolean;
  size?: "small" | "regular";
}) {
  const [visibleLayers, toggleLayer] = useVisibleLayers();

  if (!layerId) return <></>;
  const on = visibleLayers.includes(layerId);

  return (
    <button
      onClick={() => toggleLayer(layerId)}
      aria-pressed={on}
      aria-label={label + (on ? " off" : " on")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        fontSize: 15,
        cursor: "pointer",
        backgroundColor: "transparent",
        border: "none",
        borderRadius: "8px",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {!simple && (
          <Stack
            size={24}
            style={{
              color: on ? "#62ACC4" : "#A4CEDE",
              marginRight: 10,
            }}
          />
        )}
        <span
          style={{
            color: "#555",
            marginRight: 5,
            fontSize: simple ? "0.8em" : "1em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: size === "regular" ? "2.75rem" : "2.25rem",
          height: size === "regular" ? "1.5rem" : "1.25rem",
          backgroundColor: on ? "#6FC2DE" : "rgba(229, 231, 235, 1)",
          borderRadius: "9999",
          transition: "background-color 200ms ease",
          display: "flex",
          alignItems: "center",
          padding: "1px 0px",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: on ? "calc(100% - 1.25rem - 4px)" : "4px",
            width: size === "regular" ? "1.25rem" : "1.00rem",
            height: size === "regular" ? "1.25rem" : "1.00rem",
            backgroundColor: "white",
            borderRadius: "50%",
            boxShadow:
              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            transition: "left 200ms ease",
          }}
        >
          {simple && (
            <Stack size="15" color={on === true ? "#6FC2DE" : "#AAA"} />
          )}
        </span>
      </div>
    </button>
  );
}
