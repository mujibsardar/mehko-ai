# Report Issue Implementation Guide

## What We're Trying to Accomplish

We need to implement a "report an issue" functionality that allows users to report mistakes, outdated information, or problems they encounter while using the application. This functionality needs to be available in two contexts: (1) at the application overview level (for general application issues) and (2) at the individual step level (for step-specific issues).

## Specific Requirements

1. **Remove individual report icons from overview steps** - You want only the main "Report Issue" button at the top of the overview, not individual report buttons on each step listed in the "How to Apply" section.

2. **Keep the main report button** - The "big one at the top" should remain for reporting overall application issues.

3. **Add report buttons to individual step views** - Users should be able to report issues from specific steps when they're viewing them individually (info steps, form steps, PDF steps).

4. **No container wrapper for PDF steps** - For PDF form step types, don't create a separate container - just add the report button directly to the existing component.

5. **Make the report button less aggressive** - Change the styling from the current red/yellow aggressive look to something more professional and subtle.

6. **Fix scrolling issues** - Ensure all pages/components can scroll properly without content being cut off at the bottom.

7. **Preserve existing formatting** - Don't break the nice formatting that already exists for the "How to Apply" step list.

8. **Authentication requirement** - Users must be signed in/authenticated to use the report feature.

9. **Capture user information** - The report must include the user's email address for follow-up communication.

10. **Capture context information** - The report must specify whether the issue is with the overall application overview or with a specific step, including the step title/name.

## The Goal

Create a comprehensive reporting system that captures whether users are reporting an issue with the overall application or with a specific step, while maintaining the existing UI design and ensuring proper functionality across all components. The system should require authentication and collect all necessary information (user email, application context, and specific step if applicable) to enable effective follow-up and issue resolution.

## Key Files to Examine

### Core Components to Understand:

- `src/components/applications/ApplicationOverview.jsx` - Main overview component where the main report button should go
- `src/components/applications/ApplicationSteps.jsx` - Component that renders the step list (should NOT have individual report buttons)
- `src/components/dashboard/DashboardApp.jsx` - Main dashboard that handles different step types and where individual step report buttons should be added
- `src/components/applications/InfoStep.jsx` - Renders info-type steps, needs report button
- `src/components/forms/DynamicForm.jsx` - Renders form-type steps, needs report button
- `src/components/overlay/Interview.jsx` - Renders PDF-type steps, needs report button

### Authentication & Data:

- `src/hooks/useAuth.jsx` - Hook for user authentication state
- `src/firebase/firebase.js` - Firebase configuration for storing reports
- `src/firebase/userData.js` - Firebase data operations

### Styling:

- `src/components/applications/ApplicationOverview.scss` - Styling for overview section
- `src/components/applications/ApplicationSteps.scss` - Styling for steps list
- `src/components/applications/InfoStep.scss` - Styling for info steps
- `src/components/forms/DynamicForm.scss` - Styling for form steps

## Current State

All files are now reverted to their last committed state, so the new AI instance will start with a clean slate and can implement the report functionality from scratch following the requirements above.

## Implementation Notes

- The report modal should capture: user email, issue type, description, severity, and context (overview vs specific step)
- Reports should be stored in Firebase Firestore
- The UI should be consistent across all components
- Maintain existing functionality and styling while adding the new feature
- Ensure proper error handling and user feedback
