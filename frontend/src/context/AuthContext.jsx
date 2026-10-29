import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);           // Firebase user
  const [mongoUser, setMongoUser] = useState(null); // MongoDB user doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure auth session persists in browser localStorage across tabs & reloads
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Auth] Persistence setup warning:', err.message);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync with MongoDB in the background
        try {
          const token = await firebaseUser.getIdToken();
          const res = await api.post(
            '/auth/sync',
            { name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMongoUser(res.data);
        } catch (err) {
          console.warn('[Auth] MongoDB sync notice (non-blocking):', err.message);
        }
      } else {
        setUser(null);
        setMongoUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Prompt account selection so the user can freely switch between different Google accounts
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    return signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  const getToken = async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  };

  const value = { user, mongoUser, loading, loginWithGoogle, logout, getToken };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
