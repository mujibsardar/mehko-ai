import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationOverview from '../../../src/components/applications/ApplicationOverview';

// Mock the SCSS import
vi.mock('../../../src/components/applications/ApplicationOverview.scss', () => ({}));

// Mock the useAuth hook
vi.mock('../../../src/hooks/useAuth', () => ({
    _default: () => ({
        _user: { uid: 'test-user-123', _email: 'test@example.com' }
    })
}));

describe('ApplicationOverview', () => {
    const mockApplication = {
        _id: 'san_diego_county_mehko',
        _title: 'San Diego County MEHKO',
        _description: 'Home Kitchen Operations Permit for San Diego County',
        _rootDomain: 'sandiegocounty.gov',
        _steps: [
            { id: 'planning_overview', _title: 'Planning Overview', _type: 'info' },
            { _id: 'training', _title: 'Training Requirements', _type: 'info' },
            { _id: 'application', _title: 'Application Form', _type: 'pdf' }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render application overview correctly', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
        expect(screen.getByText('How to Apply')).toBeInTheDocument();
    });

    it('should display all application steps', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByText('Planning Overview')).toBeInTheDocument();
        expect(screen.getByText('Training Requirements')).toBeInTheDocument();
        expect(screen.getByText('Application Form')).toBeInTheDocument();
    });

    it('should show report button for authenticated users', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('should open report modal when report button is clicked', async () => {
        render(<ApplicationOverview application={mockApplication} />);

        const reportButton = screen.getByText('Report Issue');
        fireEvent.click(reportButton);

        // Wait for modal to appear
        await waitFor(() => {
            expect(screen.getByText('Report an Issue')).toBeInTheDocument();
        });
    });

    it('should handle applications without steps', () => {
        const applicationWithoutSteps = {
            ...mockApplication,
            _steps: undefined
        };

        render(<ApplicationOverview application={applicationWithoutSteps} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.queryByText('How to Apply')).not.toBeInTheDocument();
    });

    it('should handle applications with empty steps array', () => {
        const applicationWithEmptySteps = {
            ...mockApplication,
            _steps: []
        };

        render(<ApplicationOverview application={applicationWithEmptySteps} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        // ApplicationSteps component always renders, but content is conditional
        expect(screen.queryByText('How to Apply')).not.toBeInTheDocument();
    });

    it('should handle null application gracefully', () => {
        const { container } = render(<ApplicationOverview application={null} />);

        expect(container.firstChild).toBeNull();
    });

    it('should handle malformed application data', () => {
        const malformedApplication = {
            _id: 'malformed'
            // Missing title, description, steps
        };

        render(<ApplicationOverview application={malformedApplication} />);

        // Should render without crashing
        expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
        render(<ApplicationOverview application={mockApplication} />);

        const overview = screen.getByText('San Diego County MEHKO').closest('.application-view');
        expect(overview).toHaveClass('application-view');
    });

    it('should handle step content rendering', () => {
        const applicationWithStepContent = {
            ...mockApplication,
            _steps: [
                {
                    id: 'step1',
                    _title: 'Step 1',
                    _type: 'info',
                    _content: 'This is step content'
                }
            ]
        };

        render(<ApplicationOverview application={applicationWithStepContent} />);

        expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('should handle different step types', () => {
        const applicationWithDifferentStepTypes = {
            ...mockApplication,
            _steps: [
                { id: 'info_step', _title: 'Info Step', _type: 'info' },
                { _id: 'pdf_step', _title: 'PDF Step', _type: 'pdf' },
                { _id: 'form_step', _title: 'Form Step', _type: 'form' }
            ]
        };

        render(<ApplicationOverview application={applicationWithDifferentStepTypes} />);

        expect(screen.getByText('Info Step')).toBeInTheDocument();
        expect(screen.getByText('PDF Step')).toBeInTheDocument();
        expect(screen.getByText('Form Step')).toBeInTheDocument();
    });

    it('should handle application with missing properties', () => {
        const minimalApplication = {
            _id: 'minimal',
            _title: 'Minimal App'
            // Missing description and steps
        };

        render(<ApplicationOverview application={minimalApplication} />);

        expect(screen.getByText('Minimal App')).toBeInTheDocument();
        expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });
});
