import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  MessageSquare, 
  Trash2, 
  Download, 
  ArrowRight, 
  BookOpen, 
  Plus, 
  Clock, 
  Sparkles,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { JournalSession } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface HistoryArchiveProps {
  sessions: JournalSession[];
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onNewSession: () => void;
  onExportSession: (session: JournalSession) => void;
}

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  sessions,
  onOpenSession,
  onDeleteSession,
  onNewSession,
  onExportSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<JournalSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.summary && s.summary.toLowerCase().includes(q))
      );
    }

    return result;
  }, [sessions, searchQuery]);

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestampMs: number) => {
    const date = new Date(timestampMs);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestampMs: number) => {
    const date = new Date(timestampMs);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Archive Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Journal Archive</h2>
          <p className="mt-1 text-sm text-slate-500">
            {sessions.length === 1 ? '1 preserved reflection' : `${sessions.length} preserved reflections`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-archive-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <button
            id="btn-archive-new"
            onClick={onNewSession}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Reflection</span>
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="mt-6 space-y-4">
        {filteredSessions.length === 0 ? (
          <div 
            id="archive-empty-state" 
            className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 bg-white"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-medium text-slate-900">
              {searchQuery ? 'No matching reflections found' : 'No reflections in your archive'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try adjusting your search keywords to find past journal entries.'
                : 'Start a session in the Studio to capture your thoughts with your AI companion.'}
            </p>
            {!searchQuery && (
              <button
                id="btn-empty-start"
                onClick={onNewSession}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Begin First Reflection</span>
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              id={`session-card-${session.id}`}
              className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {session.title || 'Untitled Reflection'}
                  </h3>
                  
                  {/* Meta pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    {session.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors"
                        title="View on Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="max-w-[140px] truncate">{session.location.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-blue-400" />
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      {session.turnCount} {session.turnCount === 1 ? 'turn' : 'turns'}
                    </span>
                  </div>
                </div>

                {/* Summary or description */}
                {session.summary ? (
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {session.summary}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 italic">
                    Multi-turn reflection entry. Open to read or continue.
                  </p>
                )}
              </div>

              {/* Card Footer: Timestamps and Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(session.createdAt)}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTime(session.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onExportSession(session)}
                    title="Export reflection as Markdown"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionToDelete(session)}
                    title="Delete session"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenSession(session.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors ml-1"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        title="Delete Journal Session?"
        message={`Are you sure you want to permanently delete "${sessionToDelete?.title || 'this reflection'}"? All turns and insights will be removed from your private Firestore database.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Forever'}
        cancelLabel="Keep Session"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};
