'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';
import { updateUser as updateUserAction, deleteUser as deleteUserAction, getDBUsers } from '@/app/actions/users';

// --- Types ---
interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    availableUsers: User[];
    login: (userId: string) => void;
    logout: () => void;
    switchUser: (userId: string) => void;
    updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
    deleteUser: (id: string) => Promise<void>;
    refreshUsers: () => Promise<void>;
    syncError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();

    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [syncError, setSyncError] = useState<string | null>(null);

    const availableUsersRef = useRef<User[]>([]);
    const didFetchUsersOnAuthChange = useRef(false);
    const supabaseRef = useRef<any>(null);
    const supabasePromiseRef = useRef<Promise<any> | null>(null);

    const getSupabase = useCallback(async () => {
        if (supabaseRef.current) return supabaseRef.current;
        if (!supabasePromiseRef.current) {
            supabasePromiseRef.current = import('@/utils/supabase/client').then(m => m.createClient());
        }
        supabaseRef.current = await supabasePromiseRef.current;
        return supabaseRef.current;
    }, []);

    // Sync ref with state
    useEffect(() => {
        availableUsersRef.current = availableUsers;
    }, [availableUsers]);

    // Track auth status
    useEffect(() => {
        setIsAuthenticated(!!currentUser);
    }, [currentUser]);

    // Fetch Users from DB
    const fetchDBUsers = useCallback(async (authEmail?: string) => {
        setSyncError(null);
        try {
            const { data, success, error } = await getDBUsers();
            if (!success) {
                setSyncError(error || 'DB error');
                return;
            }
            if (success && data && data.length > 0) {
                setAvailableUsers(prev => {
                    const dbUsers = data as User[];
                    const userMap = new Map();
                    prev.forEach(u => userMap.set(u.id, u));
                    dbUsers.forEach(u => userMap.set(u.id, u));
                    dbUsers.forEach(u => {
                        if (u.email) {
                            const existingByEmail = Array.from(userMap.values()).find((ex: any) => ex.email === u.email);
                            if (existingByEmail && existingByEmail.id !== u.id) {
                                userMap.delete(existingByEmail.id);
                                userMap.set(u.id, u);
                            }
                        }
                    });

                    const result = Array.from(userMap.values());
                    if (prev.length === result.length && prev.every((u, i) => u.id === result[i].id)) {
                        return prev;
                    }
                    return result;
                });

                let currentEmail = authEmail;
                if (!currentEmail) {
                    const supabase = await getSupabase();
                    const authData = await supabase.auth.getUser();
                    currentEmail = authData.data.user?.email;
                }

                if (currentEmail) {
                    const normalizedEmail = currentEmail.toLowerCase().trim();
                    const dbUser = (data as User[]).find(u => u.email?.toLowerCase().trim() === normalizedEmail);

                    if (dbUser) {
                        setCurrentUser(prevUser => {
                            if (!prevUser) return dbUser;
                            const hasChanges =
                                dbUser.id !== prevUser.id ||
                                dbUser.roleName !== prevUser.roleName ||
                                JSON.stringify(dbUser.permissions) !== JSON.stringify(prevUser.permissions);

                            return hasChanges ? dbUser : prevUser;
                        });
                    }
                }
            }
        } catch (err: any) {
            console.error('Auth sync error:', err);
            setSyncError(err.message || String(err));
        }
    }, [getSupabase]);

    // Supabase Auth Integration
    useEffect(() => {
        const handleAuthChange = async (sessionUser: any) => {
            if (!sessionUser) {
                setCurrentUser(null);
                return;
            }

            const users = availableUsersRef.current;
            const foundUser = users.find(u => u.id === sessionUser.id || (u.email && sessionUser.email && u.email.toLowerCase() === sessionUser.email.toLowerCase()));

            if (foundUser) {
                setCurrentUser(foundUser);
            } else {
                const minimalUser: User = {
                    id: sessionUser.id,
                    name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Unknown',
                    email: sessionUser.email || '',
                    roleName: '讀取中...',
                    permissions: ['general'],
                };
                setCurrentUser(minimalUser);
            }

            didFetchUsersOnAuthChange.current = true;
            fetchDBUsers(sessionUser.email);
        };

        let subscription: any;
        let isActive = true;

        (async () => {
            const supabase = await getSupabase();
            if (!isActive) return;

            // Get initial user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Wait for DB sync before hiding loading state
                await handleAuthChange(user);
            }

            // Initial check complete
            setIsAuthLoading(false);

            // Listen for changes
            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    await handleAuthChange(session.user);
                    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
                        // Use replace to avoid back-button loops
                        router.refresh();
                        router.replace('/');
                    }
                } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                    setCurrentUser(null);
                    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                        router.refresh();
                        router.replace('/login');
                    }
                }
            });
            subscription = sub;
        })();

        return () => {
            isActive = false;
            if (subscription) subscription.unsubscribe();
        };
    }, [router, fetchDBUsers, getSupabase]);

    // Fetch users on auth change (but not on login page)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            if (didFetchUsersOnAuthChange.current) {
                didFetchUsersOnAuthChange.current = false;
                return;
            }
            fetchDBUsers();
        }
    }, [isAuthenticated, fetchDBUsers]);

    // --- Actions ---
    const login = useCallback((userId: string) => {
        const user = availableUsers.find(u => u.id === userId);
        if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            router.push('/');
        }
    }, [availableUsers, router]);

    const logout = useCallback(async () => {
        const supabase = await getSupabase();
        await supabase.auth.signOut();
        setCurrentUser(null);
        setIsAuthenticated(false);
        router.push('/login');
    }, [router, getSupabase]);

    const switchUser = useCallback((userId: string) => {
        const user = availableUsers.find(u => u.id === userId);
        if (user) {
            setCurrentUser(user);
        }
    }, [availableUsers]);

    const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
        setAvailableUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        if (currentUser?.id === id) {
            setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
        }
        const result = await updateUserAction(id, updates);
        if (result.success) {
            await fetchDBUsers();
        } else {
            await fetchDBUsers();
        }
        return result;
    }, [currentUser?.id, fetchDBUsers]);

    const deleteUser = useCallback(async (id: string) => {
        setAvailableUsers(prev => prev.filter(u => u.id !== id));
        const result = await deleteUserAction(id);
        if (!result.success) {
            console.error('Failed to delete user from DB:', result.error);
            alert('刪除失敗，請重試');
            await fetchDBUsers();
        }
        if (currentUser?.id === id) logout();
    }, [currentUser?.id, fetchDBUsers, logout]);

    const contextValue = useMemo(() => ({
        currentUser, isAuthenticated, isAuthLoading, availableUsers,
        login, logout, switchUser, updateUser, deleteUser, refreshUsers: fetchDBUsers,
        syncError
    }), [
        currentUser, isAuthenticated, isAuthLoading, availableUsers,
        login, logout, switchUser, updateUser, deleteUser, fetchDBUsers,
        syncError
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// --- Hook ---
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
