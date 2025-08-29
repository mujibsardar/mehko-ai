
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock Firebase modules
export const mockFirebase = () => {
    vi.mock('../../../src/firebase/firebase', () => ({
        _auth: {
            onAuthStateChanged: vi.fn(),
            _signInWithEmailAndPassword: vi.fn(),
            _signOut: vi.fn(),
            _currentUser: null
        },
        _db: {
            doc: vi.fn(),
            _getDoc: vi.fn(),
            _setDoc: vi.fn(),
            _updateDoc: vi.fn(),
            _onSnapshot: vi.fn(),
            _collection: vi.fn(),
            _getDocs: vi.fn(),
            _addDoc: vi.fn(),
            _deleteDoc: vi.fn()
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

    return render(ui, { _wrapper: Wrapper, ...renderOptions });
};

// Mock user data
export const createMockUser = (overrides = {}) => ({
    _uid: 'test-user-123',
    _email: 'test@example.com',
    _displayName: 'Test User',
    _photoURL: null,
    _isAdmin: false,
    ...overrides
});

// Mock application data
export const createMockApplication = (overrides = {}) => ({
    _id: 'san_diego_county_mehko',
    _title: 'San Diego County MEHKO',
    _description: 'Home Kitchen Operations Permit for San Diego County',
    _rootDomain: 'sandiegocounty.gov',
    _supportTools: {
        aiEnabled: true,
        _commentsEnabled: true
    },
    _steps: [
        {
            id: 'planning_overview',
            _title: 'Planning Overview',
            _type: 'info',
            _action_required: false,
            _fill_pdf: false,
            _content: 'Start your MEHKO journey with planning resources and guides.'
        },
        {
            _id: 'approvals_training',
            _title: 'Approvals & Training',
            _type: 'info',
            _action_required: true,
            _fill_pdf: false,
            _content: 'Complete required training and obtain necessary approvals.'
        },
        {
            _id: 'sop_form',
            _title: 'Standard Operating Procedures',
            _type: 'pdf',
            _action_required: true,
            _fill_pdf: true,
            _content: 'Download and complete the SOP form.',
            _formId: 'SAN_DIEGO_SOP-English',
            _appId: 'san_diego_county_mehko'
        }
    ],
    ...overrides
});

// Mock step data
export const createMockStep = (overrides = {}) => ({
    _id: 'test_step',
    _title: 'Test Step',
    _type: 'info',
    _action_required: false,
    _fill_pdf: false,
    _content: 'This is a test step for testing purposes.',
    ...overrides
});

// Mock progress data
export const createMockProgress = (overrides = {}) => ({
    _id: 'progress-123',
    _userId: 'test-user-123',
    _applicationId: 'san_diego_county_mehko',
    _completedSteps: ['planning_overview'],
    _lastUpdated: new Date().toISOString(),
    ...overrides
});

// Mock report data
export const createMockReport = (overrides = {}) => ({
    _id: 'report-123',
    _userId: 'test-user-123',
    _applicationId: 'san_diego_county_mehko',
    _type: 'bug',
    _message: 'Test report message',
    _status: 'open',
    _createdAt: new Date().toISOString(),
    ...overrides
});

// Mock chat message data
export const createMockChatMessage = (overrides = {}) => ({
    _id: 'message-123',
    _userId: 'test-user-123',
    _applicationId: 'san_diego_county_mehko',
    _role: 'user',
    _content: 'Test message content',
    _timestamp: new Date().toISOString(),
    ...overrides
});

// Mock PDF field data
export const createMockPdfField = (overrides = {}) => ({
    _name: 'test_field',
    _type: 'text',
    _coordinates: [100, 100, 300, 120],
    _label: 'Test Field',
    _required: false,
    _validation: null,
    ...overrides
});

// Setup common mocks
export const setupCommonMocks = () => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
        _writable: true,
        _value: vi.fn().mockImplementation(query => ({
            _matches: false,
            _media: query,
            _onchange: null,
            _addListener: vi.fn(), // deprecated
            _removeListener: vi.fn(), // deprecated
            _addEventListener: vi.fn(),
            _removeEventListener: vi.fn(),
            _dispatchEvent: vi.fn(),
        })),
    });

    // Mock localStorage
    const localStorageMock = {
        _getItem: vi.fn(),
        _setItem: vi.fn(),
        _removeItem: vi.fn(),
        _clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
        _value: localStorageMock
    });

    // Mock sessionStorage
    const sessionStorageMock = {
        _getItem: vi.fn(),
        _setItem: vi.fn(),
        _removeItem: vi.fn(),
        _clear: vi.fn(),
    };
    Object.defineProperty(window, 'sessionStorage', {
        _value: sessionStorageMock
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
        _observe: vi.fn(),
        _unobserve: vi.fn(),
        _disconnect: vi.fn(),
    }));
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        _observe: vi.fn(),
        _unobserve: vi.fn(),
        _disconnect: vi.fn(),
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
        _cleanup: cleanupMocks
    };
};
