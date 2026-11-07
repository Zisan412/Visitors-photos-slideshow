import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [foldersError, setFoldersError] = useState('');
  const [toast, setToast] = useState(null);

  const refreshFolders = useCallback(async () => {
    const result = await api.get('/folders');
    setFolders(result.folders);
    setFoldersError('');
    return result.folders;
  }, []);
  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const clearSessionError = useCallback(() => setSessionError(''), []);

  useEffect(() => {
    api.get('/auth/me')
      .then(result => setUser(result.user))
      .catch(error => {
        if (error.status !== 401) {
          setSessionError(error.message);
          showToast(error.message, 'error');
        }
      })
      .finally(() => setAuthLoading(false));
  }, [showToast]);

  useEffect(() => {
    if (!user) {
      setFolders([]);
      setFoldersLoading(false);
      setFoldersLoaded(false);
      setFoldersError('');
      return;
    }

    let active = true;
    setFoldersLoading(true);
    setFoldersError('');
    refreshFolders()
      .catch(error => {
        if (active) {
          setFoldersError(error.message);
          showToast(error.message, 'error');
        }
      })
      .finally(() => {
        if (active) {
          setFoldersLoading(false);
          setFoldersLoaded(true);
        }
      });
    return () => { active = false; };
  }, [user, refreshFolders, showToast]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({
    user,
    setUser,
    authLoading,
    sessionError,
    clearSessionError,
    folders,
    setFolders,
    foldersLoading,
    foldersLoaded,
    foldersError,
    refreshFolders,
    toast,
    showToast,
    clearToast,
  }), [user, authLoading, sessionError, folders, foldersLoading, foldersLoaded, foldersError, refreshFolders, toast, showToast, clearToast, clearSessionError]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider.');
  return context;
}
