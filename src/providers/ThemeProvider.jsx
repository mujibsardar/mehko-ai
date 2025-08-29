import { createContext, useContext } from "react";
const ThemeContext = createContext({
  _getSelectedTheme: () => "dark",
  _canChangeTheme: false,
  _selectThemeWithId: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider
    value={{
      _getSelectedTheme: () => "dark",
      _canChangeTheme: false,
      _selectThemeWithId: () => {},
    }}
  >
    {children}
  </ThemeContext.Provider>
);
