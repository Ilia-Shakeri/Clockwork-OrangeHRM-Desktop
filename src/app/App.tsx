/**
 * Clockwork - HR Attendance Reporting Tool for OrangeHRM
 * 
 * A professional, OrangeHRM-inspired desktop application for generating 
 * attendance reports from self-hosted OrangeHRM instances.
 * 
 * FEATURES:
 * - Dashboard with quick stats and recent activity
 * - Reports generation for single or multiple users
 * - Bulk scanning from text files (30+ employees)
 * - Export to PDF, CSV, and JSON formats
 * - Connection management for OrangeHRM API
 * - Customizable settings (theme, dates, exports)
 * - Comprehensive help documentation
 * 
 * DESIGN:
 * - OrangeHRM-inspired color scheme (Orange #F58321, Green #09A752)
 * - Desktop-optimized layout with sidebar navigation
 * - Responsive tables and data displays
 * - Light and dark mode support
 * - Jalali (Persian) calendar support
 * 
 * ARCHITECTURE:
 * - React + TypeScript
 * - React Router for navigation
 * - Tailwind CSS v4 for styling
 * - Motion for animations
 * - Local storage for settings persistence
 * - Mock data layer (real implementation connects to OrangeHRM API)
 * 
 * PAGES:
 * - Dashboard: Overview and quick actions
 * - Reports: Generate and export attendance reports
 * - Bulk Scan: Process multiple users from file
 * - Exports: View export history
 * - Connections: Configure API connection
 * - Settings: Customize app preferences
 * - Help: Documentation and troubleshooting
 * - Setup Wizard: First-run connection setup
 */

import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
