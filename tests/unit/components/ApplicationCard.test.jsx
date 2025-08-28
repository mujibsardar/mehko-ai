import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ApplicationCard from '../../../src/components/shared/ApplicationCard';

// Mock the SCSS import
vi.mock('../../../src/components/shared/ApplicationCard.scss', () => ({}));

describe('ApplicationCard', () => {
    const mockApplication = {
        id: 'san_diego_county_mehko',
        title: 'San Diego County MEHKO',
        description: 'Home Kitchen Operations Permit for San Diego County',
        rootDomain: 'sandiegocounty.gov',
        steps: [
            { id: 'step1', title: 'Planning Overview' },
            { id: 'step2', title: 'Training' },
            { id: 'step3', title: 'Application' }
        ]
    };

    const mockCompletedSteps = ['step1', 'step2'];

    it('should render application information correctly', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={vi.fn()}
            />
        );

        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
        expect(screen.getByText('Source: sandiegocounty.gov')).toBeInTheDocument();
    });

    it('should handle click events', () => {
        const mockOnClick = vi.fn();

        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={mockOnClick}
            />
        );

        const card = screen.getByText('San Diego County MEHKO').closest('.application-card');
        fireEvent.click(card);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should handle applications without steps', () => {
        const applicationWithoutSteps = {
            ...mockApplication,
            steps: undefined
        };

        render(
            <ApplicationCard
                application={applicationWithoutSteps}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        // Should still render basic information
        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
    });

    it('should handle applications without rootDomain', () => {
        const applicationWithoutDomain = {
            ...mockApplication,
            rootDomain: undefined
        };

        render(
            <ApplicationCard
                application={applicationWithoutDomain}
                completedSteps={mockCompletedSteps}
                onClick={vi.fn()}
            />
        );

        // Should not show source information
        expect(screen.queryByText(/Source:/)).not.toBeInTheDocument();
    });

    it('should handle empty completed steps', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        // Should still render basic information
        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
    });

    it('should handle applications with empty steps array', () => {
        const applicationWithEmptySteps = {
            ...mockApplication,
            steps: []
        };

        render(
            <ApplicationCard
                application={applicationWithEmptySteps}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        // Should still render basic information
        expect(screen.getByText('San Diego County MEHKO')).toBeInTheDocument();
        expect(screen.getByText('Home Kitchen Operations Permit for San Diego County')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={vi.fn()}
            />
        );

        const card = screen.getByText('San Diego County MEHKO').closest('.application-card');
        expect(card).toHaveClass('application-card');
    });

    it('should handle undefined onClick prop gracefully', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={undefined}
            />
        );

        const card = screen.getByText('San Diego County MEHKO').closest('.application-card');

        // Should not throw error when clicked without onClick handler
        expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should handle malformed application data gracefully', () => {
        const malformedApplication = {
            id: 'malformed',
            title: undefined,
            description: undefined,
            steps: undefined
        };

        render(
            <ApplicationCard
                application={malformedApplication}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        // Should render without crashing - check that the component exists
        expect(document.querySelector('.application-card')).toBeInTheDocument();
    });

    it('should handle applications with minimal data', () => {
        const minimalApplication = {
            id: 'minimal',
            title: 'Minimal App'
        };

        render(
            <ApplicationCard
                application={minimalApplication}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        expect(screen.getByText('Minimal App')).toBeInTheDocument();
        // Should not crash when description and rootDomain are missing
    });
});
