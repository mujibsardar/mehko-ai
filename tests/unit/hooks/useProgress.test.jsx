import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProgress } from '../../../src/hooks/useProgress';

// Mock Firebase modules
vi.mock('../../../src/firebase/firebase', () => ({
    db: {
        doc: vi.fn(),
        setDoc: vi.fn(),
        updateDoc: vi.fn(),
        onSnapshot: vi.fn()
    }
}));

// Mock Firebase functions
const mockDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockOnSnapshot = vi.fn();

// Import mocked modules
import { db } from '../../../src/firebase/firebase';

// Setup mocks
db.doc = mockDoc;
db.setDoc = mockSetDoc;
db.updateDoc = mockUpdateDoc;
db.onSnapshot = mockOnSnapshot;

describe('useProgress Hook', () => {
    const mockUserId = 'test-user-123';
    const mockAppId = 'san_diego_county_mehko';
    const mockProgressDoc = {
        id: 'progress-123',
        completedSteps: ['step1', 'step2']
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockDoc.mockReturnValue('mock-doc-ref');
        mockSetDoc.mockResolvedValue();
        mockUpdateDoc.mockResolvedValue();
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should provide initial progress state', () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => false,
                data: () => null
            });
            return vi.fn(); // unsubscribe function
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        expect(result.current.completedSteps).toEqual([]);
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should load existing progress from Firestore', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1', 'step2'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1', 'step2']);
        });

        expect(mockDoc).toHaveBeenCalledWith(db, 'users', mockUserId, 'progress', mockAppId);
    });

    it('should mark step as complete', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1']);
        });

        // Mark step as complete
        await act(async () => {
            await result.current.markStepComplete('step2');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1', 'step2'] },
            { merge: true }
        );
    });

    it('should mark step as incomplete', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1', 'step2'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1', 'step2']);
        });

        // Mark step as incomplete
        await act(async () => {
            await result.current.markStepIncomplete('step2');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1'] },
            { merge: true }
        );
    });

    it('should handle marking already completed step as complete', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1', 'step2'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1', 'step2']);
        });

        // Mark already completed step as complete
        await act(async () => {
            await result.current.markStepComplete('step1');
        });

        // Should not call setDoc since step is already completed
        expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('should handle marking non-completed step as incomplete', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1']);
        });

        // Mark non-completed step as incomplete
        await act(async () => {
            await result.current.markStepIncomplete('step2');
        });

        // Should not call setDoc since step is not completed
        expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('should create progress document if it does not exist', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => false,
                data: () => null
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual([]);
        });

        // Mark step as complete
        await act(async () => {
            await result.current.markStepComplete('step1');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1'] },
            { merge: true }
        );
    });

    it('should handle Firestore errors gracefully', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1'] })
            });
            return vi.fn();
        });

        // Mock Firestore error
        mockSetDoc.mockRejectedValue(new Error('Firestore error'));

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1']);
        });

        // Try to mark step as complete (should not throw)
        await act(async () => {
            await expect(result.current.markStepComplete('step2')).rejects.toThrow('Firestore error');
        });
    });

    it('should handle progress updates with empty completedSteps array', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: [] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual([]);
        });

        // Mark step as complete
        await act(async () => {
            await result.current.markStepComplete('step1');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1'] },
            { merge: true }
        );
    });

    it('should handle progress updates with undefined completedSteps', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: undefined })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual([]);
        });

        // Mark step as complete
        await act(async () => {
            await result.current.markStepComplete('step1');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1'] },
            { merge: true }
        );
    });

    it('should handle multiple rapid progress updates', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({ completedSteps: ['step1'] })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual(['step1']);
        });

        // Multiple rapid updates
        await act(async () => {
            await Promise.all([
                result.current.markStepComplete('step2'),
                result.current.markStepComplete('step3'),
                result.current.markStepComplete('step4')
            ]);
        });

        // Should call setDoc for each update
        expect(mockSetDoc).toHaveBeenCalledTimes(3);
    });

    it('should cleanup snapshot listener on unmount', () => {
        const unsubscribeMock = vi.fn();
        mockOnSnapshot.mockReturnValue(unsubscribeMock);

        const { unmount } = renderHook(() => useProgress(mockUserId, mockAppId));

        unmount();

        expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle progress with no user ID', () => {
        const { result } = renderHook(() => useProgress(null, mockAppId));

        expect(result.current.completedSteps).toEqual([]);
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle progress with no app ID', () => {
        const { result } = renderHook(() => useProgress(mockUserId, null));

        expect(result.current.completedSteps).toEqual([]);
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle progress with both user ID and app ID as null', () => {
        const { result } = renderHook(() => useProgress(null, null));

        expect(result.current.completedSteps).toEqual([]);
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle malformed progress data', async () => {
        mockOnSnapshot.mockImplementation((docRef, callback) => {
            callback({
                exists: () => true,
                data: () => ({
                    completedSteps: null, // malformed data
                    someOtherField: 'value'
                })
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useProgress(mockUserId, mockAppId));

        await waitFor(() => {
            expect(result.current.completedSteps).toEqual([]);
        });

        // Should still be able to mark steps
        await act(async () => {
            await result.current.markStepComplete('step1');
        });

        expect(mockSetDoc).toHaveBeenCalledWith(
            'mock-doc-ref',
            { completedSteps: ['step1'] },
            { merge: true }
        );
    });
});
