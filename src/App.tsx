import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalStudio } from './components/JournalStudio';
import { HistoryArchive } from './components/HistoryArchive';
import { NotificationsModal } from './components/NotificationsModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { JournalSession, JournalMessage } from './types';
import { 
  getUserSessions, 
  getSessionMessages, 
  deleteSession as deleteSessionFromDb 
} from './lib/firebase';
import { BookOpen, RotateCw } from 'lucide-react';

function JournalAppContent() {
  const { user, loading } = useAuth();

  const [currentTab, setCurrentTab] = useState<'studio' | 'archive'>('studio');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [activeSession, setActiveSession] = useState<JournalSession | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Load sessions from Firestore whenever authenticated user changes
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setActiveSession(null);
      return;
    }

    let isSubscribed = true;

    async function loadData() {
      if (!user) return;
      try {
        setIsLoadingSessions(true);
        setAppError(null);
        const userSessions = await getUserSessions(user.uid);
        if (isSubscribed) {
          setSessions(userSessions);
          if (userSessions.length > 0) {
            setActiveSession(userSessions[0]);
          } else {
            // Initialize first blank session
            const newSession: JournalSession = {
              id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              userId: user.uid,
              title: 'New Reflection',
              turnCount: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setActiveSession(newSession);
          }
        }
      } catch (err: any) {
        console.error('Error loading sessions from Firestore:', err);
        if (isSubscribed) {
          setAppError('Unable to load journal history from Firestore.');
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingSessions(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  // Create new session
  const handleStartNewSession = () => {
    if (!user) return;
    const newSession: JournalSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.uid,
      title: 'New Reflection',
      turnCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveSession(newSession);
    setCurrentTab('studio');
  };

  // Open existing session
  const handleOpenSession = (sessionId: string) => {
    const found = sessions.find((s) => s.id === sessionId);
    if (found) {
      setActiveSession(found);
      setCurrentTab('studio');
    }
  };

  // Update session state in list
  const handleSessionUpdated = (updatedSession: JournalSession) => {
    setActiveSession(updatedSession);
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === updatedSession.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedSession;
        // Keep sorted newest-first
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      } else {
        return [updatedSession, ...prev];
      }
    });
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteSessionFromDb(user.uid, sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (activeSession?.id === sessionId) {
        if (remaining.length > 0) {
          setActiveSession(remaining[0]);
        } else {
          handleStartNewSession();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setAppError('Failed to delete session from Firestore.');
    }
  };

  // Export session to Markdown
  const handleExportSession = async (session: JournalSession, preloadedMessages?: JournalMessage[]) => {
    if (!user) return;
    try {
      let msgs = preloadedMessages;
      if (!msgs || msgs.length === 0) {
        msgs = await getSessionMessages(user.uid, session.id);
      }

      const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
        dateStyle: 'long'
      });
      let md = `# ${session.title || 'Journal Reflection'}\n\n`;
      md += `*Recorded on: ${dateStr}*\n`;
      if (session.summary) {
        md += `*Summary: ${session.summary}*\n`;
      }
      md += `\n---\n\n`;

      for (const msg of msgs) {
        const roleLabel = msg.role === 'user' ? '### ✍️ Writer' : '### 🌿 Reflection Companion';
        const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        md += `${roleLabel} (${time})\n\n${msg.content}\n\n`;
      }

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedName = (session.title || 'journal-entry')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 35);
      link.download = `${sanitizedName}-${Date.now()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setAppError('Failed to export journal entry.');
    }
  };

  // Initial Auth Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-xs animate-pulse">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-slate-600 font-medium text-sm flex items-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-slate-400" />
          <span>Opening your private journal...</span>
        </p>
      </div>
    );
  }

  // Unauthenticated: Show Landing Page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNewSession={handleStartNewSession}
        sessionCount={sessions.length}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
      />

      {appError && (
        <div className="max-w-4xl mx-auto px-4 w-full mt-3">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <span>{appError}</span>
            <button
              onClick={() => setAppError(null)}
              className="text-red-500 font-bold ml-3"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 w-full">
        {currentTab === 'studio' ? (
          <JournalStudio
            session={activeSession}
            onSessionUpdated={handleSessionUpdated}
            onSessionDeleted={handleDeleteSession}
            onExportSession={handleExportSession}
            onStartNewSession={handleStartNewSession}
          />
        ) : (
          <HistoryArchive
            sessions={sessions}
            onOpenSession={handleOpenSession}
            onDeleteSession={handleDeleteSession}
            onNewSession={handleStartNewSession}
            onExportSession={(s) => handleExportSession(s)}
          />
        )}
      </main>

      {/* External Notifications Configuration Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

      {/* Role-Based Access Control Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <JournalAppContent />
    </AuthProvider>
  );
}
