import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import Mainlayout from "./Panel/mainlayout";
import Document from "./Document";
import DocumentGenerate from "./Panel/DocumentGenerate";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Mainlayout />} />
        <Route path="/document" element={<Document />} />
        <Route path="/generate" element={<DocumentGenerate />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
