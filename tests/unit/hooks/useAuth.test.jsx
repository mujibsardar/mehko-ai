import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../src/hooks/useAuth';

// Mock Firebase modules
vi.mock('../../../src/firebase/firebase', () => ({
    auth: {
        onAuthStateChanged: vi.fn(),
        signInWithEmailAndPassword: vi.fn(),
        signOut: vi.fn()
    },
    db: {
        doc: vi.fn(),
        getDoc: vi.fn()
    }
}));

// Mock Firebase auth functions
const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();

// Import mocked modules
import { auth, db } from '../../../src/firebase/firebase';

// Setup mocks
auth.onAuthStateChanged = mockOnAuthStateChanged;
auth.signInWithEmailAndPassword = mockSignInWithEmailAndPassword;
auth.signOut = mockSignOut;
db.doc = mockDoc;
db.getDoc = mockGetDoc;

describe('useAuth Hook', () => {
    const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        getIdTokenResult: vi.fn()
    };

    const mockUserDoc = {
        exists: () => true,
        data: () => ({ role: 'admin' })
    };

    const mockTokenResult = {
        claims: { admin: true }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser.getIdTokenResult.mockResolvedValue(mockTokenResult);
        mockDoc.mockReturnValue('mock-doc-ref');
        mockGetDoc.mockResolvedValue(mockUserDoc);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should provide initial state', () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(true);
        expect(result.current.isAdmin).toBe(false);
        expect(typeof result.current.login).toBe('function');
        expect(typeof result.current.logout).toBe('function');
        expect(typeof result.current.checkAdminStatus).toBe('function');
    });

    it('should handle user authentication state change', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn(); // unsubscribe function
        });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.loading).toBe(false);
        });
    });

    it('should handle user sign out', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });

        // Simulate user sign out
        act(() => {
            authStateCallback(null);
        });

        await waitFor(() => {
            expect(result.current.user).toBeNull();
            expect(result.current.isAdmin).toBe(false);
        });
    });

    it('should set admin status from token claims', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAdmin).toBe(true);
        });

        expect(mockUser.getIdTokenResult).toHaveBeenCalled();
    });

    it('should fallback to Firestore for admin status when token claims fail', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        // Mock token failure
        mockUser.getIdTokenResult.mockRejectedValue(new Error('Token error'));

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAdmin).toBe(true);
        });

        expect(mockDoc).toHaveBeenCalledWith(db, 'users', mockUser.uid);
        expect(mockGetDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should handle admin status check failure gracefully', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        // Mock both token and Firestore failures
        mockUser.getIdTokenResult.mockRejectedValue(new Error('Token error'));
        mockGetDoc.mockRejectedValue(new Error('Firestore error'));

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAdmin).toBe(false);
        });
    });

    it('should provide login function', async () => {
        mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        const loginResult = await result.current.login('test@example.com', 'password123');

        expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
            auth,
            'test@example.com',
            'password123'
        );
        expect(loginResult).toEqual({ user: mockUser });
    });

    it('should provide logout function', async () => {
        mockSignOut.mockResolvedValue();

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        await result.current.logout();

        expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it('should provide checkAdminStatus function', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });

        // Check admin status
        const isAdmin = await result.current.checkAdminStatus();

        expect(isAdmin).toBe(true);
        expect(result.current.isAdmin).toBe(true);
    });

    it('should handle checkAdminStatus when no user is authenticated', async () => {
        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        const isAdmin = await result.current.checkAdminStatus();

        expect(isAdmin).toBe(false);
        expect(result.current.isAdmin).toBe(false);
    });

    it('should handle non-admin users correctly', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        // Mock non-admin user
        const nonAdminUser = { ...mockUser };
        const nonAdminTokenResult = { claims: { admin: false } };
        nonAdminUser.getIdTokenResult.mockResolvedValue(nonAdminTokenResult);

        const nonAdminUserDoc = {
            exists: () => true,
            data: () => ({ role: 'user' })
        };

        mockGetDoc.mockResolvedValue(nonAdminUserDoc);

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate non-admin user sign in
        act(() => {
            authStateCallback(nonAdminUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(nonAdminUser);
            expect(result.current.isAdmin).toBe(false);
        });
    });

    it('should handle Firestore user document not existing', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        // Mock token failure and non-existent Firestore document
        mockUser.getIdTokenResult.mockRejectedValue(new Error('Token error'));
        const nonExistentUserDoc = {
            exists: () => false
        };
        mockGetDoc.mockResolvedValue(nonExistentUserDoc);

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Simulate user sign in
        act(() => {
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAdmin).toBe(false);
        });
    });

    it('should cleanup auth state listener on unmount', () => {
        const unsubscribeMock = vi.fn();
        mockOnAuthStateChanged.mockReturnValue(unsubscribeMock);

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { unmount } = renderHook(() => useAuth(), { wrapper });

        unmount();

        expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle multiple rapid auth state changes', async () => {
        let authStateCallback;
        mockOnAuthStateChanged.mockImplementation((callback) => {
            authStateCallback = callback;
            return vi.fn();
        });

        const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Rapidly change auth state
        act(() => {
            authStateCallback(mockUser);
            authStateCallback(null);
            authStateCallback(mockUser);
        });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.loading).toBe(false);
        });
    });
});
