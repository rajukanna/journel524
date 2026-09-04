import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  syncUserProfile, 
  getIdToken,
  updateUserRole 
} from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  setRole: (newRole: UserRole) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setFirebaseUser(currentUser);
          try {
            const profile = await syncUserProfile(currentUser);
            setUser(profile);
          } catch {
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || 'Reflective Writer',
              photoURL: currentUser.photoURL,
              role: currentUser.email === 'lavasraj75@gmail.com' ? 'admin' : 'user'
            });
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firebase Auth state change error:', err);
        setError('Failed to resolve authentication state. Please check your connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setError(null);
    try {
      setLoading(true);
      const fbUser = await signInWithGoogle();
      setFirebaseUser(fbUser);
      const profile = await syncUserProfile(fbUser);
      setUser(profile);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to complete Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      setLoading(true);
      await signOutUser();
      setFirebaseUser(null);
      setUser(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      await updateUserRole(user.uid, newRole);
      setUser({ ...user, role: newRole });
    } catch (err: any) {
      console.error('Failed to change role in Firestore:', err);
      // Still update local state for preview demo mode
      setUser({ ...user, role: newRole });
    }
  };

  const getToken = async (): Promise<string | null> => {
    return await getIdToken();
  };

  const clearError = () => setError(null);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        isAdmin,
        signIn: handleSignIn,
        signOut: handleSignOut,
        getToken,
        setRole: handleSetRole,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

