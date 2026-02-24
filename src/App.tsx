import { Navigate, RouterProvider, createHashRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Reports } from "@/pages/Reports";
import { BulkScan } from "@/pages/BulkScan";
import { Exports } from "@/pages/Exports";
import { Connections } from "@/pages/Connections";
import { Settings } from "@/pages/Settings";

const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "reports", Component: Reports },
      { path: "bulk-scan", Component: BulkScan },
      { path: "exports", Component: Exports },
      { path: "connections", Component: Connections },
      { path: "settings", Component: Settings },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
