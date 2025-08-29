import { createContext, useContext } from "react";
const LanguageContext = createContext({
  _getString: (key) => key,
  _getTranslation: (obj, key, fallback = false) => obj?.[key] || key,
  _canChangeLanguage: false,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => (
  <LanguageContext.Provider
    value={{
      _getString: (key) => key,
      _getTranslation: (obj, key, fallback = false) => obj?.[key] || key,
      _canChangeLanguage: false,
    }}
  >
    {children}
  </LanguageContext.Provider>
);
