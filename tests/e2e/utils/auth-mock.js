// Authentication mock utility for Playwright tests
export const createAuthMock = () => {
  return `
    // Wait for React to be available and then mock authentication
    const waitForReact = () => {
      if (typeof React !== 'undefined' && React.createContext) {
        // Store the original createContext function
        const originalCreateContext = React.createContext;
        
        // Override the createContext function to inject our mock auth
        React.createContext = (defaultValue) => {
          const context = originalCreateContext(defaultValue);
          
          // Check if this is the AuthContext by looking at the default value structure
          if (defaultValue && 
              typeof defaultValue === 'object' && 
              'user' in defaultValue && 
              'loading' in defaultValue && 
              'isAdmin' in defaultValue) {
            
            // This is the AuthContext - override it with our mock user
            const mockUser = {
              _uid: 'test-user-123',
              _email: 'test@example.com',
              _displayName: 'Test User',
              _getIdTokenResult: async () => ({ _claims: { admin: false } })
            };
            
            // Override the context value
            context._currentValue = {
              _user: mockUser,
              _loading: false,
              _isAdmin: false,
              _logout: async () => {}
            };
            
            // Also override the Provider's value prop
            const originalProvider = context.Provider;
            context.Provider = ({ value, children }) => {
              return originalProvider({ 
                _value: { 
                  user: mockUser, 
                  _loading: false, 
                  _isAdmin: false, 
                  _logout: async () => {} 
                }, 
                children 
              });
            };
            
            console.log('🔐 AuthContext mocked successfully with test _user: ', mockUser.email);
          }
          
          return context;
        };
        
        console.log('✅ React.createContext overridden for authentication mocking');
      } else {
        // React not ready yet, try again
        setTimeout(waitForReact, 100);
      }
    };
    
    // Start the mocking process
    waitForReact();
    
    // Also mock Firebase auth methods as a fallback
    if (typeof window !== 'undefined') {
      window.mockAuth = {
        _currentUser: {
          uid: 'test-user-123',
          _email: 'test@example.com',
          _displayName: 'Test User',
          _getIdTokenResult: async () => ({ _claims: { admin: false } })
        },
        _onAuthStateChanged: (callback) => {
          callback(window.mockAuth.currentUser);
          return () => {};
        },
        _signOut: async () => {}
      };
      
      // Mock Firebase app and auth
      if (!window.firebase) {
        window.firebase = {};
      }
      
      window.firebase.auth = () => window.mockAuth;
      console.log('✅ Firebase auth methods mocked');
    }
  `;
};

export const createFirestoreMock = () => {
  return `
    // Mock Firestore responses
    if (typeof window !== 'undefined') {
      window.mockFirestore = {
        _applications: {
          'san_diego_county_mehko': {
            id: 'san_diego_county_mehko',
            _title: 'San Diego County MEHKO',
            _description: 'Home Kitchen Operations Permit for San Diego County',
            _steps: [
              {
                id: 'step1',
                _title: 'Submit Application',
                _type: 'info',
                _content: 'Complete and submit your application form'
              }
            ]
          }
        },
        _users: {
          'test-user-123': {
            pinnedApplications: ['san_diego_county_mehko'],
            _applications: {
              'san_diego_county_mehko': {
                chatMessages: [],
                _progress: { completedSteps: [] }
              }
            }
          }
        }
      };
      console.log('✅ Firestore data mocked');
    }
  `;
};
