import React from 'react';
import {
  Plus,
  MessageSquare,
  FileText,
  Boxes,
  ShieldCheck,
  FileCheck,
  Cpu,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
  Sliders,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { SessionResponse } from '../../types/api';
import { SidebarSection } from '../../types/workbench';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeSection: SidebarSection;
  onSelectSection: (section: SidebarSection) => void;
  sessions: SessionResponse[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeSection,
  onSelectSection,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenSettings,
}) => {
  const { isDark, toggleDarkMode } = useTheme();
  return (
    <aside
      className={cn(
        'bg-[#131316] border-r border-white/[0.08] flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none z-10',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Top Section */}
      <div className="p-3 space-y-3 overflow-y-auto overflow-x-hidden flex-1">
        {/* New Task Button (ChatGPT Style) */}
        <button
          onClick={onNewSession}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1e1e23] hover:bg-[#27272e] border border-white/[0.08] hover:border-white/[0.16] text-sm font-medium text-white transition-all shadow-sm active:scale-[0.98]',
            collapsed && 'justify-center p-2.5'
          )}
          title="New Engineering Task"
        >
          <Plus className="w-4 h-4 text-zinc-300" />
          {!collapsed && <span className="text-xs">New Task</span>}
        </button>

        {/* Recent Tasks List (Replaces static Active Chat button) */}
        {sessions.length > 0 && (
          <div className="pt-1 space-y-1">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Recent Tasks</p>
                <span className="text-[10px] font-mono text-zinc-600">{sessions.length}</span>
              </div>
            )}

            <div className={cn('space-y-0.5 max-h-[calc(100vh-360px)] overflow-y-auto pr-1', collapsed && 'pr-0')}>
              {sessions.map((s) => {
                const isSelected = s.session_id === activeSessionId && activeSection === 'chat';
                const sessionTitle = s.title || `Task_${s.session_id.slice(0, 6)}`;

                if (collapsed) {
                  return (
                    <button
                      key={s.session_id}
                      onClick={() => {
                        onSelectSession(s.session_id);
                        onSelectSection('chat');
                      }}
                      className={cn(
                        'w-full flex items-center justify-center p-2 rounded-xl text-xs transition-all',
                        isSelected
                          ? 'bg-[#26262c] text-purple-400 shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
                      )}
                      title={sessionTitle}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  );
                }

                return (
                  <div
                    key={s.session_id}
                    onClick={() => {
                      onSelectSession(s.session_id);
                      onSelectSection('chat');
                    }}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all',
                      isSelected
                        ? 'bg-[#25252b] text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
                    )}
                    title={sessionTitle}
                  >
                    <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                      <MessageSquare
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-colors',
                          isSelected ? 'text-purple-400' : 'text-zinc-400 group-hover:text-zinc-300'
                        )}
                      />
                      <span className="truncate text-xs">{sessionTitle}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.message_count > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono px-1 rounded bg-white/[0.04]">
                          {s.message_count}
                        </span>
                      )}
                      <button
                        onClick={(e) => onDeleteSession(s.session_id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity rounded"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Workbench Modules */}
        <div className="pt-3 border-t border-white/[0.08] space-y-1">
          {!collapsed && (
            <p className="text-[11px] font-medium text-zinc-500 px-3 mb-1.5">Workbench Modules</p>
          )}

          <button
            onClick={() => onSelectSection('documents')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              activeSection === 'documents'
                ? 'bg-[#25252b] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
            )}
            title={collapsed ? 'Documents & RAG' : undefined}
          >
            <FileText className="w-4 h-4 shrink-0 text-blue-400" />
            {!collapsed && <span>Documents & SOPs</span>}
          </button>

          <button
            onClick={() => onSelectSection('artifacts')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              activeSection === 'artifacts'
                ? 'bg-[#25252b] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
            )}
            title={collapsed ? 'Artifacts Workspace' : undefined}
          >
            <Boxes className="w-4 h-4 shrink-0 text-purple-400" />
            {!collapsed && <span>Artifact Workspace</span>}
          </button>

          <button
            onClick={() => onSelectSection('audit')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              activeSection === 'audit'
                ? 'bg-[#25252b] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
            )}
            title={collapsed ? 'Audit Lineage' : undefined}
          >
            <FileCheck className="w-4 h-4 shrink-0 text-amber-400" />
            {!collapsed && <span>Audit Trail</span>}
          </button>

          <button
            onClick={() => onSelectSection('hardware')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              activeSection === 'hardware'
                ? 'bg-[#25252b] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1e]'
            )}
            title={collapsed ? 'Hardware & Models' : undefined}
          >
            <Cpu className="w-4 h-4 shrink-0 text-cyan-400" />
            {!collapsed && <span>Hardware & Models</span>}
          </button>
        </div>
      </div>

      {/* Bottom Controls: Settings, Theme & Collapse Toggle */}
      <div className="p-3 border-t border-white/[0.08] space-y-1">
        {/* Settings & Theme Quick Row */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className={cn(
              'flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#1a1a1e] transition-all group',
              collapsed && 'justify-center px-0'
            )}
            title="Settings & Preferences"
          >
            <Settings className="w-4 h-4 shrink-0 text-zinc-400 group-hover:text-purple-400 transition-colors" />
            {!collapsed && <span>Settings</span>}
          </button>

          {!collapsed && (
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1a1a1e] transition-all shrink-0"
              title={isDark ? 'Switch to Daylight / Light Paper Mode' : 'Switch to Dark Obsidian Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
            </button>
          )}
        </div>

        {/* In collapsed mode: separate Theme Toggle button */}
        {collapsed && (
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#1a1a1e] transition-all"
            title={isDark ? 'Switch to Daylight / Light Paper Mode' : 'Switch to Dark Obsidian Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-[#1a1a1e] text-zinc-400 hover:text-white transition-all text-xs"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2">Close Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
