// eslint.config.js
import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import babelParser from "@babel/eslint-parser";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ["@babel/preset-react"] },
      },
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        browser: true,
        node: true,
        document: true,
        window: true,
        console: true,
        fetch: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        alert: true,
        FormData: true,
        URL: true,
        URLSearchParams: true,
        Image: true,
        navigator: true,
        getComputedStyle: true,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
    settings: { react: { version: "detect" } },
  },
];
