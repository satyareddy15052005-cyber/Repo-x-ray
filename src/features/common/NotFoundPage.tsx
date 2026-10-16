import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, FolderGit2 } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]">
      <FileQuestion className="w-16 h-16 text-slate-300 mb-4 stroke-1" />
      <h1 className="text-2xl font-bold text-slate-900">404 — Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        The route you are trying to access does not exist or may belong to an analysis that was deleted.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Home className="w-3.5 h-3.5 text-slate-500" />
          <span>Home</span>
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>View My Projects</span>
        </button>
      </div>
    </div>
  );
}
