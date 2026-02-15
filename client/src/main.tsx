import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#e4e4e7",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            fontFamily: "VT323, monospace",
            fontSize: "16px",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
