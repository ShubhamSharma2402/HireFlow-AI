import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);           // Firebase user
  const [mongoUser, setMongoUser] = useState(null); // MongoDB user doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync with MongoDB
        try {
          const token = await firebaseUser.getIdToken();
          const res = await api.post(
            '/auth/sync',
            { name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMongoUser(res.data);
        } catch (err) {
          console.error('[Auth] Failed to sync user with MongoDB:', err.message);
        }
      } else {
        setUser(null);
        setMongoUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, name) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }
    return credential;
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
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

  const value = { user, mongoUser, loading, signup, login, loginWithGoogle, logout, getToken };

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
