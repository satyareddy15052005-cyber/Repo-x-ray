import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './features/landing/LandingPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ImportPage } from './features/importer/ImportPage';
import { ProjectOverviewPage } from './features/projects/ProjectOverviewPage';
import { GraphPage } from './features/graph/GraphPage';
import { FunctionGraphPage } from './features/graph/FunctionGraphPage';
import { FileExplorerPage } from './features/explorer/FileExplorerPage';
import { ModulesPage } from './features/modules/ModulesPage';
import { InsightsPage } from './features/insights/InsightsPage';
import { ImpactPage } from './features/impact/ImpactPage';
import { ChangeRiskPage } from './features/risk/ChangeRiskPage';
import { DeadCodePage } from './features/deadcode/DeadCodePage';
import { ArchitectureRulesPage } from './features/rules/ArchitectureRulesPage';
import { DuplicateCodePage } from './features/duplicates/DuplicateCodePage';
import { CodeComplexityPage } from './features/complexity/CodeComplexityPage';
import { HealthHistoryPage } from './features/history/HealthHistoryPage';
import { ArchitectureDocsPage } from './features/docs/ArchitectureDocsPage';
import { ComparePage } from './features/compare/ComparePage';
import { ExportPage } from './features/export/ExportPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NotFoundPage } from './features/common/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page with its own hero presentation */}
        <Route path="/" element={<LandingPage />} />

        {/* Workspace Shell */}
        <Route element={<AppShell />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ImportPage />} />
          <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="/projects/:projectId/reanalyze" element={<ImportPage />} />
          <Route path="/projects/:projectId/graph" element={<GraphPage />} />
          <Route path="/projects/:projectId/functions" element={<FunctionGraphPage />} />
          <Route path="/projects/:projectId/files" element={<FileExplorerPage />} />
          <Route path="/projects/:projectId/files/*" element={<FileExplorerPage />} />
          <Route path="/projects/:projectId/modules" element={<ModulesPage />} />
          <Route path="/projects/:projectId/insights" element={<InsightsPage />} />
          <Route path="/projects/:projectId/impact" element={<ImpactPage />} />
          <Route path="/projects/:projectId/risk" element={<ChangeRiskPage />} />
          <Route path="/projects/:projectId/dead-code" element={<DeadCodePage />} />
          <Route path="/projects/:projectId/rules" element={<ArchitectureRulesPage />} />
          <Route path="/projects/:projectId/duplicates" element={<DuplicateCodePage />} />
          <Route path="/projects/:projectId/complexity" element={<CodeComplexityPage />} />
          <Route path="/projects/:projectId/history" element={<HealthHistoryPage />} />
          <Route path="/projects/:projectId/docs" element={<ArchitectureDocsPage />} />
          <Route path="/projects/:projectId/compare" element={<ComparePage />} />
          <Route path="/projects/:projectId/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
