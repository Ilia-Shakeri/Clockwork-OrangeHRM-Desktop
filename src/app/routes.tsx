import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Dashboard } from "./pages/dashboard";
import { Reports } from "./pages/reports";
import { BulkScan } from "./pages/bulk-scan";
import { Exports } from "./pages/exports";
import { Connections } from "./pages/connections";
import { Settings } from "./pages/settings";
import { Help } from "./pages/help";
import { ConnectionWizard } from "./pages/connection-wizard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "reports", Component: Reports },
      { path: "bulk-scan", Component: BulkScan },
      { path: "exports", Component: Exports },
      { path: "connections", Component: Connections },
      { path: "settings", Component: Settings },
      { path: "help", Component: Help },
    ],
  },
  {
    path: "/setup",
    Component: ConnectionWizard,
  },
]);
