import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase modules BEFORE importing the hook
vi.mock('../../../src/firebase/firebase', () => ({
    _db: {
        collection: vi.fn(() => 'mock-collection-ref'),
        _doc: vi.fn(() => 'mock-doc-ref'),
        _setDoc: vi.fn(() => Promise.resolve()),
        _onSnapshot: vi.fn(() => vi.fn()), // Returns unsubscribe function
    }
}));

vi.mock('firebase/firestore', () => ({
    _collection: vi.fn(() => 'mock-collection-ref'),
    _doc: vi.fn(() => 'mock-doc-ref'),
    _setDoc: vi.fn(() => Promise.resolve()),
    _onSnapshot: vi.fn(() => vi.fn()), // Returns unsubscribe function
}));

// Now import the hook after mocking
import useProgress from '../../../src/hooks/useProgress';

describe('useProgress Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should provide initial progress state', () => {
        const { result } = renderHook(() => useProgress('test-user', 'test-app'));

        expect(result.current.completedSteps).toEqual([]);
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle progress with no user ID', () => {
        const { result } = renderHook(() => useProgress(null, 'test-app'));

        expect(result.current.completedSteps).toEqual([]);
    });

    it('should handle progress with no app ID', () => {
        const { result } = renderHook(() => useProgress('test-user', null));

        expect(result.current.completedSteps).toEqual([]);
    });

    it('should handle progress with both user ID and app ID as null', () => {
        const { result } = renderHook(() => useProgress(null, null));

        expect(result.current.completedSteps).toEqual([]);
    });

    it('should provide markStepComplete function', () => {
        const { result } = renderHook(() => useProgress('test-user', 'test-app'));

        expect(typeof result.current.markStepComplete).toBe('function');
    });

    it('should provide markStepIncomplete function', () => {
        const { result } = renderHook(() => useProgress('test-user', 'test-app'));

        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle basic hook initialization', () => {
        const { result } = renderHook(() => useProgress('test-user', 'test-app'));

        expect(result.current).toBeDefined();
        expect(result.current.completedSteps).toBeDefined();
    });

    it('should handle different user IDs', () => {
        const { _result: result1 } = renderHook(() => useProgress('user1', 'test-app'));
        const { _result: result2 } = renderHook(() => useProgress('user2', 'test-app'));

        expect(result1.current.completedSteps).toEqual([]);
        expect(result2.current.completedSteps).toEqual([]);
    });

    it('should handle different app IDs', () => {
        const { _result: result1 } = renderHook(() => useProgress('test-user', 'app1'));
        const { _result: result2 } = renderHook(() => useProgress('test-user', 'app2'));

        expect(result1.current.completedSteps).toEqual([]);
        expect(result2.current.completedSteps).toEqual([]);
    });

    it('should maintain hook structure across renders', () => {
        const { result, rerender } = renderHook(() => useProgress('test-user', 'test-app'));

        rerender();

        expect(result.current.completedSteps).toBeDefined();
        expect(typeof result.current.markStepComplete).toBe('function');
        expect(typeof result.current.markStepIncomplete).toBe('function');
    });

    it('should handle empty string parameters', () => {
        const { result } = renderHook(() => useProgress('', ''));

        expect(result.current.completedSteps).toBeDefined();
    });

    it('should handle undefined parameters', () => {
        const { result } = renderHook(() => useProgress(undefined, undefined));

        expect(result.current.completedSteps).toBeDefined();
    });

    it('should handle null parameters', () => {
        const { result } = renderHook(() => useProgress(null, null));

        expect(result.current.completedSteps).toBeDefined();
    });

    it('should provide consistent interface', () => {
        const { result } = renderHook(() => useProgress('test-user', 'test-app'));

        const expectedKeys = ['completedSteps', 'markStepComplete', 'markStepIncomplete'];
        expectedKeys.forEach(key => {
            expect(result.current).toHaveProperty(key);
        });
    });

    it('should handle multiple hook instances', () => {
        const { _result: result1 } = renderHook(() => useProgress('user1', 'app1'));
        const { _result: result2 } = renderHook(() => useProgress('user2', 'app2'));

        expect(result1.current.completedSteps).toEqual([]);
        expect(result2.current.completedSteps).toEqual([]);
    });
});
