import type { RawFile } from '../engine/analysis/analysisPipeline';

export const SAMPLE_PROJECT_NAME = 'Nexus Platform (Sample Codebase)';

export const SAMPLE_PROJECT_FILES: RawFile[] = [
  {
    relativePath: 'package.json',
    byteSize: 420,
    content: `{
  "name": "nexus-platform",
  "version": "2.4.0",
  "private": true,
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.500.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}`,
  },
  {
    relativePath: 'tsconfig.json',
    byteSize: 310,
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}`,
  },
  {
    relativePath: 'src/main.tsx',
    byteSize: 280,
    content: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  },
  {
    relativePath: 'src/App.tsx',
    byteSize: 760,
    content: `import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './features/dashboard/Dashboard';
import { useAuth } from './hooks/useAuth';
import { AppRoutes } from './router/routes';

export default function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar isAuthenticated={isAuthenticated} />
        <main className="flex-1 p-6">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}`,
  },
  {
    relativePath: 'src/components/Header.tsx',
    byteSize: 520,
    content: `import React from 'react';
import { UserProfile } from '../models/user';
import { formatDate } from '../lib/formatters';

interface HeaderProps {
  user: UserProfile | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white">
      <div className="font-semibold text-slate-900">Nexus Platform</div>
      <div className="text-sm text-slate-500">
        {user ? user.displayName : 'Guest User'} · {formatDate(new Date())}
      </div>
    </header>
  );
}`,
  },
  {
    relativePath: 'src/components/Sidebar.tsx',
    byteSize: 480,
    content: `import React from 'react';
import { AppRoutes } from '../router/routes';

interface SidebarProps {
  isAuthenticated: boolean;
}

export default function Sidebar({ isAuthenticated }: SidebarProps) {
  return (
    <aside className="w-60 border-r border-slate-200 bg-white p-4">
      <nav className="space-y-1">
        {AppRoutes.map(route => (
          <div key={route.path} className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded">
            {route.title}
          </div>
        ))}
      </nav>
    </aside>
  );
}`,
  },
  {
    relativePath: 'src/components/MetricCard.tsx',
    byteSize: 410,
    content: `import React from 'react';
import { formatNumber } from '../lib/formatters';

interface MetricCardProps {
  label: string;
  value: number;
  delta: number;
}

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900">{formatNumber(value)}</div>
      <div className="text-xs text-emerald-600">+{delta}% vs last week</div>
    </div>
  );
}`,
  },
  {
    relativePath: 'src/services/apiClient.ts',
    byteSize: 720,
    content: `export interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`);
    const data = await res.json();
    return {
      data,
      status: res.status,
      timestamp: new Date().toISOString(),
    };
  }

  async post<T>(endpoint: string, payload: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return {
      data: await res.json(),
      status: res.status,
      timestamp: new Date().toISOString(),
    };
  }
}

export const defaultApiClient = new ApiClient();`,
  },
  {
    relativePath: 'src/services/authService.ts',
    byteSize: 840,
    content: `import { defaultApiClient } from './apiClient';
import { UserProfile } from '../models/user';
import { sanitizeInput } from '../lib/utils';

export class AuthService {
  private currentUser: UserProfile | null = null;

  async login(username: string, token: string): Promise<UserProfile> {
    const cleanUser = sanitizeInput(username);
    const response = await defaultApiClient.post<UserProfile>('/auth/login', {
      username: cleanUser,
      token,
    });
    this.currentUser = response.data;
    return this.currentUser;
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  logout(): void {
    this.currentUser = null;
  }
}

export const authService = new AuthService();`,
  },
  {
    relativePath: 'src/services/userService.ts',
    byteSize: 520,
    content: `import { defaultApiClient } from './apiClient';
import { UserProfile } from '../models/user';

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await defaultApiClient.get<UserProfile>(\`/users/\${userId}\`);
  return res.data;
}

export async function updateUserStatus(userId: string, active: boolean): Promise<void> {
  await defaultApiClient.post(\`/users/\${userId}/status\`, { active });
}`,
  },
  {
    relativePath: 'src/hooks/useAuth.ts',
    byteSize: 640,
    content: `import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserProfile } from '../models/user';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(authService.getCurrentUser());

  useEffect(() => {
    // Sync current session state
    const current = authService.getCurrentUser();
    setUser(current);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
  };
}`,
  },
  {
    relativePath: 'src/hooks/useMetrics.ts',
    byteSize: 590,
    content: `import { useState, useEffect } from 'react';
import { AnalyticsEngine } from '../features/analytics/AnalyticsEngine';
import { MetricPoint } from '../models/metrics';

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);

  useEffect(() => {
    const engine = new AnalyticsEngine();
    const data = engine.computeAggregateMetrics();
    setMetrics(data);
  }, []);

  return { metrics };
}`,
  },
  {
    relativePath: 'src/lib/utils.ts',
    byteSize: 340,
    content: `export function sanitizeInput(val: string): string {
  return val.trim().replace(/<[^>]*>?/gm, '');
}

export function classNames(...classes: Array<string | boolean | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}`,
  },
  {
    relativePath: 'src/lib/formatters.ts',
    byteSize: 420,
    content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}`,
  },
  {
    relativePath: 'src/models/user.ts',
    byteSize: 260,
    content: `export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'engineer' | 'viewer';
  lastActive: string;
}`,
  },
  {
    relativePath: 'src/models/metrics.ts',
    byteSize: 220,
    content: `export interface MetricPoint {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  category: 'performance' | 'reliability' | 'usage';
}`,
  },
  {
    relativePath: 'src/router/routes.ts',
    byteSize: 410,
    content: `export interface RouteDef {
  path: string;
  title: string;
}

export const AppRoutes: RouteDef[] = [
  { path: '/', title: 'Dashboard' },
  { path: '/analytics', title: 'Analytics' },
  { path: '/settings', title: 'Settings' },
];`,
  },
  {
    relativePath: 'src/router/guard.ts',
    byteSize: 380,
    content: `import { authService } from '../services/authService';

export function canAccessRoute(path: string): boolean {
  const user = authService.getCurrentUser();
  if (!user && path !== '/login') {
    return false;
  }
  return true;
}`,
  },
  {
    relativePath: 'src/features/dashboard/Dashboard.tsx',
    byteSize: 690,
    content: `import React from 'react';
import { MetricCard } from '../../components/MetricCard';
import { useMetrics } from '../../hooks/useMetrics';
import { SyncManager } from '../sync/syncManager';

export default function Dashboard() {
  const { metrics } = useMetrics();
  const syncManager = new SyncManager();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">System Performance</h1>
      <div className="grid grid-cols-3 gap-4">
        {metrics.map(m => (
          <MetricCard key={m.id} label={m.name} value={m.value} delta={4.2} />
        ))}
      </div>
    </div>
  );
}`,
  },
  {
    relativePath: 'src/features/analytics/AnalyticsEngine.ts',
    byteSize: 760,
    content: `import { MetricPoint } from '../../models/metrics';
import { defaultApiClient } from '../../services/apiClient';

export class AnalyticsEngine {
  computeAggregateMetrics(): MetricPoint[] {
    return [
      { id: 'm-1', name: 'Request Throughput', value: 14200, timestamp: new Date().toISOString(), category: 'performance' },
      { id: 'm-2', name: 'Database Latency', value: 18, timestamp: new Date().toISOString(), category: 'performance' },
      { id: 'm-3', name: 'Active Sessions', value: 3840, timestamp: new Date().toISOString(), category: 'usage' },
    ];
  }

  async streamMetrics(): Promise<void> {
    await defaultApiClient.get('/metrics/live');
  }
}`,
  },
  {
    relativePath: 'src/features/analytics/ReportGenerator.ts',
    byteSize: 510,
    content: `import { AnalyticsEngine } from './AnalyticsEngine';
import { formatDate } from '../../lib/formatters';

export class ReportGenerator {
  generatePdfReport(): string {
    const engine = new AnalyticsEngine();
    const metrics = engine.computeAggregateMetrics();
    return \`Report generated on \${formatDate(new Date())} with \${metrics.length} metrics.\`;
  }
}`,
  },
  {
    relativePath: 'src/features/sync/syncManager.ts',
    byteSize: 580,
    content: `import { ConflictResolver } from './conflictResolver';

export class SyncManager {
  private resolver: ConflictResolver;

  constructor() {
    this.resolver = new ConflictResolver(this);
  }

  triggerSync(): void {
    console.log('Initiating state synchronization');
  }

  handleResolutionComplete(): void {
    console.log('Conflicts successfully resolved');
  }
}`,
  },
  {
    relativePath: 'src/features/sync/conflictResolver.ts',
    byteSize: 490,
    content: `import { SyncManager } from './syncManager';

export class ConflictResolver {
  private manager: SyncManager;

  constructor(manager: SyncManager) {
    this.manager = manager;
  }

  resolveConflicts(): void {
    // Circular call back to manager to notify
    this.manager.handleResolutionComplete();
  }
}`,
  },
];
