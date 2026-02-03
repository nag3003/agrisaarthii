import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { ProfileService } from '../services/profile';
import { Storage } from '../services/storage';

interface AuthContextType {
  user: any | null;
  role: string | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  refreshSession: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      setLoading(true);
      // 1. Firebase Logout
      await auth.signOut();
      // 2. Clear Local Storage
      await Storage.clearAll();
      // 3. Clear State
      setUser(null);
      setRole(null);
    } catch (e) {
      console.error("AuthContext: Logout error", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    const storedUser = await Storage.getUser();
    
    if (user || storedUser) {
      const activeUser = user || storedUser;
      try {
        // If it's a demo user, don't try to fetch from Firebase
        if (activeUser.uid.startsWith('demo_')) {
          setRole(activeUser.role || 'farmer');
          setUser(activeUser);
          return;
        }

        const profile = await ProfileService.getProfile(activeUser.uid);
        if (profile) {
          setRole(profile.role);
          setUser(activeUser);
          await Storage.saveUser({
            uid: activeUser.uid,
            email: activeUser.email || '',
            role: profile.role,
          });
        } else {
          setRole('farmer');
          setUser(activeUser);
          await Storage.saveUser({
            uid: activeUser.uid,
            email: activeUser.email || '',
            role: 'farmer',
          });
        }
      } catch (error: any) {
        console.error('AuthContext: Error refreshing session:', error);
      }
    }
  };

  useEffect(() => {
    // Initial check for stored user (Demo or persistent session)
    const checkPersistedUser = async () => {
      const storedUser = await Storage.getUser();
      if (storedUser && storedUser.uid.startsWith('demo_')) {
        setUser(storedUser);
        setRole(storedUser.role || 'farmer');
        setLoading(false);
      }
    };
    
    checkPersistedUser();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profile = await ProfileService.getProfile(firebaseUser.uid);
          if (profile) {
            setRole(profile.role);
            await Storage.saveUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: profile.role,
            });
          } else {
            setRole('farmer');
            await Storage.saveUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'farmer',
            });
          }
        } catch (error: any) {
          console.error('AuthContext: Error in auth state change:', error);
          setRole('farmer');
        }
      } else {
        // Only clear if not in demo mode
        const currentStored = await Storage.getUser();
        if (!currentStored || !currentStored.uid.startsWith('demo_')) {
          setUser(null);
          setRole(null);
          await Storage.clearUser();
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
