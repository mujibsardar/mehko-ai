import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ApplicationCard from '../../../src/components/shared/ApplicationCard';

// Mock the SCSS import
vi.mock('./ApplicationCard.scss', () => ({}));

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

    it('should display progress information correctly', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={vi.fn()}
            />
        );

        // Should show 2 out of 3 steps completed (66%)
        expect(screen.getByText('2 of 3 steps completed')).toBeInTheDocument();
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

        const card = screen.getByRole('button');
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

        // Should show 0% progress when no steps
        expect(screen.getByText('0 of 0 steps completed')).toBeInTheDocument();
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

        // Should show 0% progress
        expect(screen.getByText('0 of 3 steps completed')).toBeInTheDocument();
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

        // Should show 0 of 0 steps
        expect(screen.getByText('0 of 0 steps completed')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
                onClick={vi.fn()}
            />
        );

        const card = screen.getByRole('button');
        expect(card).toHaveClass('application-card');
    });

    it('should handle undefined onClick prop gracefully', () => {
        render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={mockCompletedSteps}
            />
        );

        const card = screen.getByRole('button');

        // Should not throw error when clicked without onClick handler
        expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should handle malformed application data gracefully', () => {
        const malformedApplication = {
            id: 'test',
            title: null,
            description: undefined,
            steps: null
        };

        render(
            <ApplicationCard
                application={malformedApplication}
                completedSteps={[]}
                onClick={vi.fn()}
            />
        );

        // Should render without crashing
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should calculate progress percentage correctly', () => {
        const { rerender } = render(
            <ApplicationCard
                application={mockApplication}
                completedSteps={['step1']}
                onClick={vi.fn()}
            />
        );

        // 1 out of 3 steps = 33%
        expect(screen.getByText('1 of 3 steps completed')).toBeInTheDocument();

        // 3 out of 3 steps = 100%
        rerender(
            <ApplicationCard
                application={mockApplication}
                completedSteps={['step1', 'step2', 'step3']}
                onClick={vi.fn()}
            />
        );

        expect(screen.getByText('3 of 3 steps completed')).toBeInTheDocument();
    });
});
