import React, { createContext, useContext } from "react";

const LanguageContext = createContext({
  getString: (key) => key,
  getTranslation: (obj, key, fallback = false) => obj?.[key] || key,
  canChangeLanguage: false,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => (
  <LanguageContext.Provider
    value={{
      getString: (key) => key,
      getTranslation: (obj, key, fallback = false) => obj?.[key] || key,
      canChangeLanguage: false,
    }}
  >
    {children}
  </LanguageContext.Provider>
);
