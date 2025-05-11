import React, { createContext, useContext } from "react";

const ThemeContext = createContext({
  getSelectedTheme: () => "dark",
  canChangeTheme: false,
  selectThemeWithId: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider
    value={{
      getSelectedTheme: () => "dark",
      canChangeTheme: false,
      selectThemeWithId: () => {},
    }}
  >
    {children}
  </ThemeContext.Provider>
);
