import React from "react";

export default function Hotspot({ onEnter }) {
  return (
    <div
      className="cgpt-pin-hotspot"
      onMouseEnter={onEnter}
    />
  );
}
