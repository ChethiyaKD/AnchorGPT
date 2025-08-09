import React, { useState, useEffect } from "react";
import {
  saveToStorage,
  getFromStorage,
} from "./controllers/storageController.js";
import { createRoot } from "react-dom/client";


function Popup() {
  return <div className="container"></div>;
}

const root = createRoot(document.getElementById("react-target"));
root.render(<Popup />);
