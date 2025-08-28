import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock Firebase modules
export const mockFirebase = () => {
    vi.mock('../../../src/firebase/firebase', () => ({
        auth: {
            onAuthStateChanged: vi.fn(),
            signInWithEmailAndPassword: vi.fn(),
            signOut: vi.fn(),
            currentUser: null
        },
        db: {
            doc: vi.fn(),
            getDoc: vi.fn(),
            setDoc: vi.fn(),
            updateDoc: vi.fn(),
            onSnapshot: vi.fn(),
            collection: vi.fn(),
            getDocs: vi.fn(),
            addDoc: vi.fn(),
            deleteDoc: vi.fn()
        }
    }));
};

// Mock Firebase auth functions
export const mockAuthFunctions = () => {
    const mockOnAuthStateChanged = vi.fn();
    const mockSignInWithEmailAndPassword = vi.fn();
    const mockSignOut = vi.fn();

    return {
        mockOnAuthStateChanged,
        mockSignInWithEmailAndPassword,
        mockSignOut
    };
};

// Mock Firebase firestore functions
export const mockFirestoreFunctions = () => {
    const mockDoc = vi.fn();
    const mockGetDoc = vi.fn();
    const mockSetDoc = vi.fn();
    const mockUpdateDoc = vi.fn();
    const mockOnSnapshot = vi.fn();
    const mockCollection = vi.fn();
    const mockGetDocs = vi.fn();
    const mockAddDoc = vi.fn();
    const mockDeleteDoc = vi.fn();

    return {
        mockDoc,
        mockGetDoc,
        mockSetDoc,
        mockUpdateDoc,
        mockOnSnapshot,
        mockCollection,
        mockGetDocs,
        mockAddDoc,
        mockDeleteDoc
    };
};

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
    const {
        route = '/',
        ...renderOptions
    } = options;

    window.history.pushState({}, 'Test page', route);

    const Wrapper = ({ children }) => (
        <BrowserRouter>
            {children}
        </BrowserRouter>
    );

    return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock user data
export const createMockUser = (overrides = {}) => ({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    isAdmin: false,
    ...overrides
});

// Mock application data
export const createMockApplication = (overrides = {}) => ({
    id: 'san_diego_county_mehko',
    title: 'San Diego County MEHKO',
    description: 'Home Kitchen Operations Permit for San Diego County',
    rootDomain: 'sandiegocounty.gov',
    supportTools: {
        aiEnabled: true,
        commentsEnabled: true
    },
    steps: [
        {
            id: 'planning_overview',
            title: 'Planning Overview',
            type: 'info',
            action_required: false,
            fill_pdf: false,
            content: 'Start your MEHKO journey with planning resources and guides.'
        },
        {
            id: 'approvals_training',
            title: 'Approvals & Training',
            type: 'info',
            action_required: true,
            fill_pdf: false,
            content: 'Complete required training and obtain necessary approvals.'
        },
        {
            id: 'sop_form',
            title: 'Standard Operating Procedures',
            type: 'pdf',
            action_required: true,
            fill_pdf: true,
            content: 'Download and complete the SOP form.',
            formId: 'SAN_DIEGO_SOP-English',
            appId: 'san_diego_county_mehko'
        }
    ],
    ...overrides
});

// Mock step data
export const createMockStep = (overrides = {}) => ({
    id: 'test_step',
    title: 'Test Step',
    type: 'info',
    action_required: false,
    fill_pdf: false,
    content: 'This is a test step for testing purposes.',
    ...overrides
});

// Mock progress data
export const createMockProgress = (overrides = {}) => ({
    id: 'progress-123',
    userId: 'test-user-123',
    applicationId: 'san_diego_county_mehko',
    completedSteps: ['planning_overview'],
    lastUpdated: new Date().toISOString(),
    ...overrides
});

// Mock report data
export const createMockReport = (overrides = {}) => ({
    id: 'report-123',
    userId: 'test-user-123',
    applicationId: 'san_diego_county_mehko',
    type: 'bug',
    message: 'Test report message',
    status: 'open',
    createdAt: new Date().toISOString(),
    ...overrides
});

// Mock chat message data
export const createMockChatMessage = (overrides = {}) => ({
    id: 'message-123',
    userId: 'test-user-123',
    applicationId: 'san_diego_county_mehko',
    role: 'user',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    ...overrides
});

// Mock PDF field data
export const createMockPdfField = (overrides = {}) => ({
    name: 'test_field',
    type: 'text',
    coordinates: [100, 100, 300, 120],
    label: 'Test Field',
    required: false,
    validation: null,
    ...overrides
});

// Setup common mocks
export const setupCommonMocks = () => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // Mock localStorage
    const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
    });

    // Mock sessionStorage
    const sessionStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', {
        value: sessionStorageMock
    });

    // Mock fetch
    global.fetch = vi.fn();

    // Mock console methods to reduce noise in tests
    const originalConsole = { ...console };
    beforeAll(() => {
        console.log = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();
    });

    afterAll(() => {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
    });
};

// Cleanup function
export const cleanupMocks = () => {
    vi.clearAllMocks();
    vi.clearAllTimers();
};

// Wait for element to be removed
export const waitForElementToBeRemoved = async (element, options = {}) => {
    const { timeout = 5000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (!document.contains(element)) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Element was not removed within timeout');
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
};

// Mock requestAnimationFrame
export const mockRequestAnimationFrame = () => {
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0));
    global.cancelAnimationFrame = vi.fn();
};

// Create test environment
export const createTestEnvironment = () => {
    setupCommonMocks();
    mockIntersectionObserver();
    mockResizeObserver();
    mockRequestAnimationFrame();

    return {
        cleanup: cleanupMocks
    };
};
