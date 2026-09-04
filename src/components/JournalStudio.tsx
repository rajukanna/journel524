import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  Edit3, 
  Check, 
  Download, 
  Trash2, 
  AlertCircle, 
  RotateCw, 
  Lightbulb, 
  Compass, 
  Bot,
  User as UserIcon,
  MapPin,
  Bell,
  X
} from 'lucide-react';
import { JournalSession, JournalMessage, JournalLocation, NotificationSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  saveSession, 
  saveMessage, 
  getSessionMessages, 
  getUserNotificationSettings,
  stripUndefined 
} from '../lib/firebase';
import { ConfirmModal } from './ConfirmModal';
import { LocationPickerModal } from './LocationPickerModal';

interface JournalStudioProps {
  session: JournalSession | null;
  onSessionUpdated: (updatedSession: JournalSession) => void;
  onSessionDeleted: (sessionId: string) => void;
  onExportSession: (session: JournalSession, messages: JournalMessage[]) => void;
  onStartNewSession: () => void;
}

const INSPIRATION_PROMPTS = [
  'What is currently consuming the most space in your thoughts?',
  'What is one small win from today worth acknowledging?',
  'Describe a moment recently where you felt genuine ease.',
  'What is a difficult emotion you are carrying right now?',
  'What would you tell a dear friend facing your current situation?'
];

export const JournalStudio: React.FC<JournalStudioProps> = ({
  session,
  onSessionUpdated,
  onSessionDeleted,
  onExportSession,
  onStartNewSession,
}) => {
  const { user, getToken } = useAuth();

  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Location modal & Notification Alert state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationAlert, setNotificationAlert] = useState<{
    type: string;
    summary: string;
    dispatched: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user notification preferences
  useEffect(() => {
    if (!user) return;
    getUserNotificationSettings(user.uid)
      .then((settings) => setNotificationSettings(settings))
      .catch((err) => console.warn('Could not load notification settings:', err));
  }, [user?.uid]);

  // Load messages whenever active session changes
  useEffect(() => {
    if (!session || !user) {
      setMessages([]);
      return;
    }

    setEditedTitle(session.title);
    setNotificationAlert(null);
    let isCurrent = true;

    async function fetchMessages() {
      if (!session || !user) return;
      try {
        setIsLoadingMessages(true);
        setErrorMessage(null);
        const fetched = await getSessionMessages(user.uid, session.id);
        if (isCurrent) {
          setMessages(fetched);
        }
      } catch (err: any) {
        console.error('Error fetching session messages:', err);
        if (isCurrent) {
          setErrorMessage('Could not load prior entries. Please check connection.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingMessages(false);
        }
      }
    }

    fetchMessages();

    return () => {
      isCurrent = false;
    };
  }, [session?.id, user?.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Handle title save
  const handleSaveTitle = async () => {
    if (!session || !user || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    const newTitle = editedTitle.trim();
    const updated: JournalSession = {
      ...session,
      title: newTitle,
      updatedAt: Date.now(),
    };

    try {
      await saveSession(user.uid, updated);
      onSessionUpdated(updated);
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
      setErrorMessage('Could not save title change.');
    }
  };

  // Handle location update for active session
  const handleSaveLocation = async (newLocation: JournalLocation | null) => {
    if (!session || !user) return;

    const updated: JournalSession = {
      ...session,
      location: newLocation || undefined,
      updatedAt: Date.now(),
    };

    try {
      await saveSession(user.uid, updated);
      onSessionUpdated(updated);
    } catch (err) {
      console.error('Failed to update location:', err);
      setErrorMessage('Could not save location pin.');
    }
  };

  // Send turn
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isSubmitting || !user || !session) return;

    setErrorMessage(null);
    setRetryAction(null);
    setIsSubmitting(true);

    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userMsg: JournalMessage = {
      id: userMessageId,
      sessionId: session.id,
      role: 'user',
      content: textToSend.trim(),
      createdAt: Date.now(),
    };

    // 1. Guaranteed database persistence of user input BEFORE clearing input buffer
    try {
      await saveMessage(user.uid, session.id, userMsg);
    } catch (saveErr: any) {
      console.error('Failed to persist user message:', saveErr);
      setErrorMessage('Could not save your journal entry to storage. Please click Retry.');
      setRetryAction(() => () => handleSendMessage(textToSend));
      setIsSubmitting(false);
      return;
    }

    // Input persisted successfully - safely advance UI state and clear buffer
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');

    // 2. Request companion response via secure backend proxy
    await requestCompanionTurn(userMsg, updatedMessages);
  };

  const requestCompanionTurn = async (userMsg: JournalMessage, currentMessages: JournalMessage[]) => {
    if (!user || !session) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setRetryAction(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('User session token is unavailable. Please sign in again.');
      }

      const response = await fetch('/api/journal/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          userMessage: userMsg.content,
          conversationHistory: currentMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          location: session.location || null,
          notificationSettings: notificationSettings || null
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const turnResult = await response.json();
      if (!turnResult.success || !turnResult.data) {
        throw new Error(turnResult.error || 'Failed to generate response.');
      }

      const { reply, suggestedTitle, suggestedSummary, parsedEvent, notificationDispatched } = turnResult.data;

      // If milestone or breakthrough detected, display celebration badge
      if (parsedEvent && parsedEvent.detectedType !== 'none') {
        setNotificationAlert({
          type: parsedEvent.detectedType,
          summary: parsedEvent.summary,
          dispatched: Boolean(notificationDispatched)
        });
      }

      // 3. Save companion response to Firestore
      const modelMessageId = `msg-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`;
      const modelMsg: JournalMessage = {
        id: modelMessageId,
        sessionId: session.id,
        role: 'model',
        content: reply,
        createdAt: Date.now(),
      };

      await saveMessage(user.uid, session.id, modelMsg);
      setMessages([...currentMessages, modelMsg]);

      // 4. Update session metadata in Firestore
      const nextTurnCount = session.turnCount + 1;
      const updatedSession: JournalSession = {
        ...session,
        turnCount: nextTurnCount,
        title: (currentMessages.length <= 1 && suggestedTitle) ? suggestedTitle : session.title,
        summary: suggestedSummary || session.summary,
        updatedAt: Date.now(),
      };

      await saveSession(user.uid, updatedSession);
      onSessionUpdated(updatedSession);

    } catch (err: any) {
      console.error('Journal companion turn error:', err);
      setErrorMessage(err.message || 'Companion is momentarily unavailable. Click Retry to continue.');
      setRetryAction(() => () => requestCompanionTurn(userMsg, currentMessages));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summarize whole session with Gemini
  const handleSummarizeSession = async () => {
    if (!session || !user || messages.length === 0 || isSummarizing) return;

    try {
      setIsSummarizing(true);
      setErrorMessage(null);
      const token = await getToken();
      if (!token) throw new Error('Authentication expired.');

      const sessionText = messages
        .map((m) => `${m.role === 'user' ? 'Writer' : 'Companion'}: ${m.content}`)
        .join('\n\n');

      const res = await fetch('/api/journal/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionText,
          title: session.title
        })
      });

      if (!res.ok) {
        throw new Error('Failed to summarize session.');
      }

      const result = await res.json();
      if (result.success && result.data) {
        const updatedSession: JournalSession = {
          ...session,
          title: result.data.title || session.title,
          summary: result.data.summary || session.summary,
          updatedAt: Date.now()
        };
        await saveSession(user.uid, updatedSession);
        onSessionUpdated(updatedSession);
        setEditedTitle(updatedSession.title);
      }
    } catch (err: any) {
      console.error('Summarize error:', err);
      setErrorMessage('Could not generate session summary at this time.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Delete session handler
  const confirmDelete = async () => {
    if (!session) return;
    try {
      setIsDeleting(true);
      await onSessionDeleted(session.id);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Start a Reflective Dialogue</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Begin writing freely. Your AI companion will hold space, reflect what it hears, and ask thoughtful clarifying questions.
        </p>
        <button
          id="btn-studio-start"
          onClick={onStartNewSession}
          className="mt-6 px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
        >
          Create New Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Session Header */}
      <div className="pb-4 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-lg font-semibold text-slate-900 bg-white border border-slate-300 rounded-md px-2.5 py-1 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-md"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 rounded-md"
                title="Save Title"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {session.title || 'Untitled Reflection'}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                title="Edit Title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Pinned Location Tag */}
            {session.location ? (
              <button
                id="btn-active-location-chip"
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors group"
                title="Change or remove pinned location"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="max-w-[200px] truncate">{session.location.name}</span>
                <span className="text-[10px] text-blue-400 group-hover:text-blue-600 ml-0.5">Edit</span>
              </button>
            ) : (
              <button
                id="btn-pin-location-header"
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors"
                title="Pin a location to this reflection"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Pin Location</span>
              </button>
            )}

            {session.summary && (
              <p className="text-xs text-slate-500 line-clamp-1 italic">
                {session.summary}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {messages.length >= 2 && (
            <button
              id="btn-summarize-session"
              type="button"
              onClick={handleSummarizeSession}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors disabled:opacity-50"
              title="Generate AI reflection recap"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : 'text-blue-600'}`} />
              <span>{isSummarizing ? 'Synthesizing...' : 'Summarize'}</span>
            </button>
          )}

          <button
            id="btn-export-session"
            type="button"
            onClick={() => onExportSession(session, messages)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title="Download Journal as Markdown"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id="btn-delete-session"
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breakthrough / Milestone Alert Banner */}
      {notificationAlert && (
        <div 
          id="banner-insight-alert"
          className="my-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 text-slate-800 text-xs sm:text-sm flex items-center justify-between gap-3 shrink-0 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 capitalize">
                  {notificationAlert.type.replace('_', ' ')} Detected
                </span>
                {notificationAlert.dispatched && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Bell className="w-3 h-3 text-emerald-600" />
                    Alert Dispatched to Slack
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-xs mt-0.5">{notificationAlert.summary}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationAlert(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div id="journal-error-banner" className="my-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {retryAction && (
              <button
                id="btn-error-retry"
                type="button"
                onClick={() => {
                  const retry = retryAction;
                  setErrorMessage(null);
                  setRetryAction(null);
                  retry();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
            <button
              id="btn-error-dismiss"
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setRetryAction(null);
              }}
              className="text-red-500 hover:text-red-800 font-medium px-2 py-0.5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
        {isLoadingMessages ? (
          <div className="py-16 text-center text-sm text-slate-400">
            <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Retrieving your private reflections...
          </div>
        ) : messages.length === 0 ? (
          /* Empty Session: Prompt Starters */
          <div className="py-8 px-4 sm:px-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span>Prompt Starters for Mindful Reflection</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Write whatever comes to mind, or choose one of these invitations to start:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INSPIRATION_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setInputText(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-left p-3 rounded-xl text-xs sm:text-sm text-slate-700 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors leading-relaxed"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                {msg.role === 'user' ? (
                  <>
                    <span className="text-[11px] font-medium text-slate-400">You</span>
                    <UserIcon className="w-3 h-3 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-medium text-slate-600">Reflective Companion</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-sm sm:text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-slate-100 rounded-br-xs shadow-xs font-normal'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Processing Indicator */}
        {isSubmitting && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-medium text-slate-500">Companion is reflecting...</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-4 text-sm text-slate-500 flex items-center gap-3 shadow-xs">
              <div className="flex space-x-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-xs text-slate-400">Pondering and formulating questions</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-3 border-t border-slate-200/90 shrink-0 bg-slate-50">
        <div className="relative rounded-2xl bg-white border border-slate-300/90 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all p-3">
          <textarea
            ref={textareaRef}
            id="journal-input-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your thoughts freely... (Cmd/Ctrl + Enter to reflect)"
            rows={3}
            disabled={isSubmitting}
            className="w-full text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-transparent border-0 focus:outline-hidden resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="btn-input-pin-location"
                type="button"
                onClick={() => setShowLocationModal(true)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                  session.location 
                    ? 'text-blue-600 bg-blue-50 font-medium' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Pin or edit location"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{session.location ? session.location.name : 'Pin Location'}</span>
              </button>
              <span>{inputText.length} characters</span>
              <span className="hidden sm:inline">&bull; Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 rounded border border-slate-200 text-slate-500 font-mono">⌘ + Enter</kbd></span>
            </div>

            <button
              id="btn-journal-send"
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
            >
              <span>{isSubmitting ? 'Reflecting...' : 'Reflect'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-center text-slate-400">
          Reflections are saved automatically to your isolated Firestore account. Non-clinical companion.
        </p>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLocation={session.location}
        onSaveLocation={handleSaveLocation}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Reflection Session?"
        message={`Are you sure you want to permanently delete "${session.title}"? This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Keep Session"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
