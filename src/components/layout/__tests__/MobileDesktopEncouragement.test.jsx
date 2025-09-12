import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileDesktopEncouragement from '../MobileDesktopEncouragement';

// Mock the WindowProvider
const mockIsMobileLayout = vi.fn(() => true);
const mockWindowProvider = {
  isMobileLayout: mockIsMobileLayout,
};

vi.mock('../../providers/WindowProvider', () => ({
  useWindow: () => mockWindowProvider,
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// No window.open usage anymore

describe('MobileDesktopEncouragement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockIsMobileLayout.mockReturnValue(true);
  });

  it('should not render when not on mobile layout', () => {
    mockIsMobileLayout.mockReturnValue(false);

    const { container } = render(<MobileDesktopEncouragement />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when previously dismissed', () => {
    mockIsMobileLayout.mockReturnValue(true);
    localStorageMock.getItem.mockReturnValue('true');

    const { container } = render(<MobileDesktopEncouragement />);
    expect(container.firstChild).toBeNull();
  });

  it('should render on mobile layout when not dismissed', () => {
    // Mock window.innerWidth to be mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    mockIsMobileLayout.mockReturnValue(true);
    localStorageMock.getItem.mockReturnValue(null);

    render(<MobileDesktopEncouragement skipDelay={true} />);

    // The component should render immediately since we're mocking mobile layout
    expect(screen.getByText('💻 Better Experience on Desktop')).toBeInTheDocument();
    expect(screen.getByText('For the best MEHKO application experience with full features, we recommend using a desktop or laptop computer.')).toBeInTheDocument();
  });

  it('should handle dismiss button click', () => {
    // Mock window.innerWidth to be mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    mockIsMobileLayout.mockReturnValue(true);
    localStorageMock.getItem.mockReturnValue(null);

    render(<MobileDesktopEncouragement skipDelay={true} />);

    const dismissButton = screen.getByText('Continue on Mobile');
    fireEvent.click(dismissButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('mobile-desktop-encouragement-dismissed', 'true');
  });

  // 'Open in Desktop' has been removed; no action to test here
});
