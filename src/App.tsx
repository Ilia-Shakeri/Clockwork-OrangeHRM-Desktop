import { Navigate, RouterProvider, createHashRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Reports } from "@/pages/Reports";
import { UsersPage } from "@/pages/Users";
import { Exports } from "@/pages/Exports";
import { Connections } from "@/pages/Connections";
import { Presence } from "@/pages/Presence";
import { Settings } from "@/pages/Settings";

const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "users", Component: UsersPage },
      { path: "reports", Component: Reports },
      { path: "presence", Component: Presence },
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
