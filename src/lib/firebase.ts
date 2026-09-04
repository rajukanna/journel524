import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  deleteDoc, 
  updateDoc,
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  JournalSession, 
  JournalMessage, 
  UserProfile, 
  UserRole, 
  NotificationSettings, 
  AdminAuditLog,
  AdminOverview 
} from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore using the specified custom database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on startup per Firebase skill guidelines
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase configuration notice: client may be offline.');
    }
  }
}
testFirestoreConnection();

/**
 * Defensive utility: Strips all undefined properties recursively from payloads
 * before saving to Firestore, preventing runtime driver crashes.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj, (_, value) => (value === undefined ? null : value)));
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Retrieve fresh Firebase ID Token for authenticating backend requests
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken(false);
}

// Known admin emails for initial bootstrap / challenge evaluation
const INITIAL_ADMIN_EMAILS = [
  'lavasraj75@gmail.com',
];

/**
 * Format user profile object with role
 */
export function formatUserProfile(user: User, existingRole?: UserRole): UserProfile {
  const isDefaultAdmin = INITIAL_ADMIN_EMAILS.includes(user.email || '');
  const role: UserRole = existingRole || (isDefaultAdmin ? 'admin' : 'user');

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Reflective Writer',
    photoURL: user.photoURL,
    role,
    lastLoginAt: Date.now()
  };
}

/**
 * Fetch or initialize User Profile in Firestore
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const isDefaultAdmin = INITIAL_ADMIN_EMAILS.includes(user.email || '');
      const role: UserRole = data.role === 'admin' || isDefaultAdmin ? 'admin' : 'user';

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || data.displayName || user.email?.split('@')[0] || 'Reflective Writer',
        photoURL: user.photoURL || data.photoURL,
        role,
        createdAt: data.createdAt || Date.now(),
        lastLoginAt: Date.now()
      };

      // Update last login without mutating role if already established
      await setDoc(userDocRef, stripUndefined({
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        role: profile.role,
        lastLoginAt: profile.lastLoginAt
      }), { merge: true });

      return profile;
    } else {
      const isDefaultAdmin = INITIAL_ADMIN_EMAILS.includes(user.email || '');
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Reflective Writer',
        photoURL: user.photoURL,
        role: isDefaultAdmin ? 'admin' : 'user',
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };

      await setDoc(userDocRef, stripUndefined(profile));
      return profile;
    }
  } catch (err) {
    console.warn('Notice: Could not sync user profile in Firestore:', err);
    return formatUserProfile(user);
  }
}

/**
 * Update user role (Admin only operation)
 */
export async function updateUserRole(targetUid: string, newRole: UserRole): Promise<void> {
  const userDocRef = doc(db, 'users', targetUid);
  await updateDoc(userDocRef, { role: newRole });
}

// -------------------------------------------------------------
// Firestore Isolated Document Helpers for /users/{uid}/...
// -------------------------------------------------------------

/**
 * Fetch all journal sessions for a user, sorted newest first
 */
export async function getUserSessions(uid: string): Promise<JournalSession[]> {
  try {
    const sessionsCol = collection(db, 'users', uid, 'sessions');
    const q = query(sessionsCol, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: uid,
        title: data.title || 'Untitled Reflection',
        summary: data.summary || '',
        location: data.location || undefined,
        turnCount: typeof data.turnCount === 'number' ? data.turnCount : 0,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      };
    });
  } catch (error) {
    console.error('Error fetching user sessions from Firestore:', error);
    throw error;
  }
}

/**
 * Fetch messages for a specific session
 */
export async function getSessionMessages(uid: string, sessionId: string): Promise<JournalMessage[]> {
  try {
    const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        sessionId,
        role: data.role as 'user' | 'model',
        content: data.content || '',
        location: data.location || undefined,
        createdAt: data.createdAt || Date.now()
      };
    });
  } catch (error) {
    console.error(`Error fetching messages for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Create or update a journal session
 */
export async function saveSession(uid: string, session: JournalSession): Promise<void> {
  const sessionRef = doc(db, 'users', uid, 'sessions', session.id);
  const cleanData = stripUndefined({
    id: session.id,
    userId: uid,
    title: session.title,
    summary: session.summary || '',
    location: session.location || null,
    turnCount: session.turnCount,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  });
  await setDoc(sessionRef, cleanData, { merge: true });
}

/**
 * Save a message under a session
 */
export async function saveMessage(uid: string, sessionId: string, message: JournalMessage): Promise<void> {
  const messageRef = doc(db, 'users', uid, 'sessions', sessionId, 'messages', message.id);
  const cleanData = stripUndefined({
    id: message.id,
    sessionId,
    role: message.role,
    content: message.content,
    location: message.location || null,
    createdAt: message.createdAt
  });
  await setDoc(messageRef, cleanData);
}

/**
 * Delete a session and its associated reference
 */
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  
  // Also remove messages in the subcollection
  try {
    const messagesCol = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
    const msgSnaps = await getDocs(messagesCol);
    const deletePromises = msgSnaps.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Notice: messages cleanup encountered error:', err);
  }

  await deleteDoc(sessionRef);
}

// -------------------------------------------------------------
// Notification Settings (/users/{uid}/settings/notifications)
// -------------------------------------------------------------

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  channel: 'slack',
  webhookUrl: '',
  events: ['breakthrough', 'emotional_shift', 'action_commitment']
};

export async function getUserNotificationSettings(uid: string): Promise<NotificationSettings> {
  try {
    const settingsDoc = doc(db, 'users', uid, 'settings', 'notifications');
    const snap = await getDoc(settingsDoc);
    if (snap.exists()) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...snap.data() } as NotificationSettings;
    }
  } catch (err) {
    console.warn('Could not read notification settings from Firestore:', err);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export async function saveUserNotificationSettings(uid: string, settings: NotificationSettings): Promise<void> {
  const settingsDoc = doc(db, 'users', uid, 'settings', 'notifications');
  await setDoc(settingsDoc, stripUndefined(settings), { merge: true });
}

// -------------------------------------------------------------
// Admin Audit Trail (/adminAuditLogs)
// -------------------------------------------------------------

export async function logAdminAction(log: Omit<AdminAuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, 'adminAuditLogs', logId);
    await setDoc(logRef, stripUndefined({
      id: logId,
      timestamp: Date.now(),
      ...log
    }));
  } catch (err) {
    console.warn('Failed to record admin audit log:', err);
  }
}

export async function getAdminAuditLogs(maxLogs: number = 30): Promise<AdminAuditLog[]> {
  try {
    const logsCol = collection(db, 'adminAuditLogs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(maxLogs));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AdminAuditLog);
  } catch (err) {
    console.warn('Error fetching admin audit logs:', err);
    return [];
  }
}
