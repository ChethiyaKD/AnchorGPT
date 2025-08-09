import React from "react";
import PinItem from "./PinItem.jsx";

export default function PinList({ pins, setPins, afterClick }) {
  if (!pins?.length) {
    return <div className="cgpt-pin-empty">No pins yet. Click 📌 on any message.</div>;
  }
  return (
    <div className="cgpt-pin-list">
      {pins.map((p) => (
        <PinItem
          key={p.id}
          pin={p}
          onRemove={() => setPins(pins.filter(x => x.id !== p.id))}
          onClick={afterClick}
        />
      ))}
    </div>
  );
}
