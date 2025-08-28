import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationOverview from '../../../src/components/applications/ApplicationOverview';

// Mock the SCSS import
vi.mock('./ApplicationOverview.scss', () => ({}));

// Mock the ReportButton component
vi.mock('../../generic/ReportButton', () => ({
    default: ({ children, onClick }) => (
        <button data-testid="report-button" onClick={onClick}>
            {children}
        </button>
    )
}));

// Mock the ReportIssueModal component
vi.mock('../../modals/ReportIssueModal', () => ({
    default: ({ isOpen, onClose, application, onReportSubmitted }) => (
        isOpen ? (
            <div data-testid="report-modal">
                <h3>Report Issue</h3>
                <p>Application: {application?.title}</p>
                <button data-testid="close-modal" onClick={onClose}>
                    Close
                </button>
                <button data-testid="submit-report" onClick={() => onReportSubmitted({ type: 'bug', message: 'Test report' })}>
                    Submit Report
                </button>
            </div>
        ) : null
    )
}));

// Mock the ApplicationSteps component
vi.mock('./ApplicationSteps', () => ({
    default: ({ steps }) => (
        <div data-testid="application-steps">
            {steps?.map((step, index) => (
                <div key={index} data-testid={`step-${step.id}`}>
                    {step.title}
                </div>
            ))}
        </div>
    )
}));

// Mock the useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
    default: () => ({
        user: { uid: 'test-user-123', email: 'test@example.com' }
    })
}));

describe('ApplicationOverview', () => {
    const mockApplication = {
        id: 'san_diego_county_mehko',
        title: 'San Diego County MEHKO',
        description: 'Home Kitchen Operations Permit for San Diego County',
        rootDomain: 'sandiegocounty.gov',
        steps: [
            { id: 'planning_overview', title: 'Planning Overview', type: 'info' },
            { id: 'training', title: 'Training Requirements', type: 'info' },
            { id: 'application', title: 'Application Form', type: 'pdf' }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render application overview correctly', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
        expect(screen.getByTestId('application-steps')).toBeInTheDocument();
    });

    it('should display all application steps', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByTestId('step-planning_overview')).toBeInTheDocument();
        expect(screen.getByTestId('step-training')).toBeInTheDocument();
        expect(screen.getByTestId('step-application')).toBeInTheDocument();

        expect(screen.getByText('Planning Overview')).toBeInTheDocument();
        expect(screen.getByText('Training Requirements')).toBeInTheDocument();
        expect(screen.getByText('Application Form')).toBeInTheDocument();
    });

    it('should show report button for authenticated users', () => {
        render(<ApplicationOverview application={mockApplication} />);

        expect(screen.getByTestId('report-button')).toBeInTheDocument();
        expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('should open report modal when report button is clicked', async () => {
        render(<ApplicationOverview application={mockApplication} />);

        const reportButton = screen.getByTestId('report-button');
        fireEvent.click(reportButton);

        await waitFor(() => {
            expect(screen.getByTestId('report-modal')).toBeInTheDocument();
        });

        expect(screen.getByText('Report Issue')).toBeInTheDocument();
        expect(screen.getByText('Application: San Diego County MEHKO')).toBeInTheDocument();
    });

    it('should close report modal when close button is clicked', async () => {
        render(<ApplicationOverview application={mockApplication} />);

        // Open modal
        fireEvent.click(screen.getByTestId('report-button'));

        await waitFor(() => {
            expect(screen.getByTestId('report-modal')).toBeInTheDocument();
        });

        // Close modal
        fireEvent.click(screen.getByTestId('close-modal'));

        await waitFor(() => {
            expect(screen.queryByTestId('report-modal')).not.toBeInTheDocument();
        });
    });

    it('should handle report submission', async () => {
        const mockOnReportSubmitted = vi.fn();

        render(
            <ApplicationOverview
                application={mockApplication}
                onReportSubmitted={mockOnReportSubmitted}
            />
        );

        // Open modal
        fireEvent.click(screen.getByTestId('report-button'));

        await waitFor(() => {
            expect(screen.getByTestId('report-modal')).toBeInTheDocument();
        });

        // Submit report
        fireEvent.click(screen.getByTestId('submit-report'));

        expect(mockOnReportSubmitted).toHaveBeenCalledWith({
            type: 'bug',
            message: 'Test report'
        });
    });

    it('should handle applications without steps', () => {
        const applicationWithoutSteps = {
            ...mockApplication,
            steps: undefined
        };

        render(<ApplicationOverview application={applicationWithoutSteps} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.queryByTestId('application-steps')).not.toBeInTheDocument();
    });

    it('should handle applications with empty steps array', () => {
        const applicationWithEmptySteps = {
            ...mockApplication,
            steps: []
        };

        render(<ApplicationOverview application={applicationWithEmptySteps} />);

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByTestId('application-steps')).toBeInTheDocument();
        expect(screen.getByTestId('application-steps')).toBeEmptyDOMElement();
    });

    it('should handle null application gracefully', () => {
        render(<ApplicationOverview application={null} />);

        // Should render nothing when no application is provided
        expect(screen.queryByText('San Diego County MEHKO')).not.toBeInTheDocument();
        expect(screen.queryByTestId('application-steps')).not.toBeInTheDocument();
    });

    it('should handle malformed application data', () => {
        const malformedApplication = {
            id: 'test',
            title: null,
            description: undefined,
            steps: null
        };

        render(<ApplicationOverview application={malformedApplication} />);

        // Should render without crashing
        expect(screen.getByTestId('report-button')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
        render(<ApplicationOverview application={mockApplication} />);

        const overview = screen.getByTestId('application-overview');
        expect(overview).toHaveClass('application-view');
    });

    it('should handle step content rendering', () => {
        const applicationWithStepContent = {
            ...mockApplication,
            steps: [
                {
                    id: 'step1',
                    title: 'Step 1',
                    type: 'info',
                    content: 'This is step content'
                }
            ]
        };

        render(<ApplicationOverview application={applicationWithStepContent} />);

        expect(screen.getByTestId('step-step1')).toBeInTheDocument();
        expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('should handle different step types', () => {
        const applicationWithDifferentStepTypes = {
            ...mockApplication,
            steps: [
                { id: 'info_step', title: 'Info Step', type: 'info' },
                { id: 'pdf_step', title: 'PDF Step', type: 'pdf' },
                { id: 'form_step', title: 'Form Step', type: 'form' }
            ]
        };

        render(<ApplicationOverview application={applicationWithDifferentStepTypes} />);

        expect(screen.getByTestId('step-info_step')).toBeInTheDocument();
        expect(screen.getByTestId('step-pdf_step')).toBeInTheDocument();
        expect(screen.getByTestId('step-form_step')).toBeInTheDocument();
    });

    it('should handle application with missing properties', () => {
        const incompleteApplication = {
            id: 'incomplete',
            title: 'Incomplete App'
            // Missing description and steps
        };

        render(<ApplicationOverview application={incompleteApplication} />);

        expect(screen.getByText('Incomplete App')).toBeInTheDocument();
        expect(screen.queryByTestId('application-steps')).not.toBeInTheDocument();
    });
});
