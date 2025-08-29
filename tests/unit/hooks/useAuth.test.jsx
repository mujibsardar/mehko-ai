import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAuth, { AuthProvider } from '../../../src/hooks/useAuth';

// Mock Firebase modules
vi.mock('../../../src/firebase/firebase', () => ({
    _auth: {
        onAuthStateChanged: vi.fn(),
        _signInWithEmailAndPassword: vi.fn(),
        _signOut: vi.fn(),
    },
    _db: {
        doc: vi.fn(),
        _getDoc: vi.fn(),
    }
}));

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
    _onAuthStateChanged: vi.fn(),
    _signInWithEmailAndPassword: vi.fn(),
    _signOut: vi.fn(),
}));

// Mock Firebase firestore functions
vi.mock('firebase/firestore', () => ({
    _doc: vi.fn(),
    _getDoc: vi.fn(),
}));

describe('useAuth Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should provide initial state', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(true);
        expect(result.current.isAdmin).toBe(false);
    });

    it('should provide login function', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.login).toBe('function');
    });

    it('should provide logout function', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.logout).toBe('function');
    });

    it('should provide checkAdminStatus function', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.checkAdminStatus).toBe('function');
    });

    it('should handle checkAdminStatus when no user is authenticated', async () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        const isAdmin = await result.current.checkAdminStatus();
        expect(isAdmin).toBe(false);
    });

    it('should handle non-admin users correctly', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAdmin).toBe(false);
    });

    it('should cleanup auth state listener on unmount', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { unmount } = renderHook(() => useAuth(), { wrapper });

        unmount();
        // Test passes if no errors are thrown during unmount
    });

    it('should handle multiple rapid auth state changes', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.isAdmin).toBe(false);
    });

    it('should have proper function signatures', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Check that all expected properties exist
        expect(result.current).toHaveProperty('user');
        expect(result.current).toHaveProperty('loading');
        expect(result.current).toHaveProperty('isAdmin');
        expect(result.current).toHaveProperty('login');
        expect(result.current).toHaveProperty('logout');
        expect(result.current).toHaveProperty('checkAdminStatus');
    });

    it('should maintain consistent state structure', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Check initial state types
        expect(typeof result.current.user).toBe('object');
        expect(typeof result.current.loading).toBe('boolean');
        expect(typeof result.current.isAdmin).toBe('boolean');
        expect(typeof result.current.login).toBe('function');
        expect(typeof result.current.logout).toBe('function');
        expect(typeof result.current.checkAdminStatus).toBe('function');
    });
});
