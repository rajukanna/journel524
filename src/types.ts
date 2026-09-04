export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface JournalLocation {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  location?: JournalLocation;
  turnCount: number;
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
}

export interface JournalMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'model';
  content: string;
  location?: JournalLocation;
  createdAt: number; // Unix timestamp ms
}

export type NotificationEventType = 
  | 'breakthrough' 
  | 'milestone' 
  | 'emotional_shift' 
  | 'gratitude' 
  | 'action_commitment';

export interface NotificationSettings {
  enabled: boolean;
  channel: 'slack';
  webhookUrl: string;
  events: NotificationEventType[];
}

export interface NotificationPayload {
  event: 'journal_entry_parsed';
  eventType: NotificationEventType;
  sessionId: string;
  timestamp: number;
  summary: string;
  sentiment?: string;
  location?: JournalLocation;
  metadata: {
    source: string;
    turnCount: number;
    userEmail?: string;
  };
}

export interface ParsedEntryEvent {
  detectedType: NotificationEventType | 'none';
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  sentiment?: string;
}

export interface TurnResponse {
  reply: string;
  modelUsed: string;
  suggestedTitle?: string;
  suggestedSummary?: string;
  parsedEvent?: ParsedEntryEvent;
  notificationDispatched?: boolean;
}

export interface AdminAuditLog {
  id: string;
  timestamp: number;
  adminUid: string;
  adminEmail?: string;
  action: string;
  targetUid?: string;
  details?: Record<string, any>;
  ip?: string;
}

export interface AdminOverviewUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  sessionCount: number;
  createdAt: number;
}

export interface AdminOverview {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  notificationsDispatched: number;
  recentAuditLogs: AdminAuditLog[];
  users: AdminOverviewUser[];
  systemHealth: {
    firebase: boolean;
    gemini: boolean;
    googleMaps: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
