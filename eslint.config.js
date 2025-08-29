import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import babelParser from "@babel/eslint-parser";

export default [
  js.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.min.js",
      "*.bundle.js",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "python/**/venv/**",
      "python/**/.venv/**",
      "python/**/__pycache__/**",
    ],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"],
        },
      },
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        alert: "readonly",
        confirm: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        getComputedStyle: "readonly",
        navigator: "readonly",
        performance: "readonly",
        setImmediate: "readonly",
        MessageChannel: "readonly",
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        global: "readonly",
      },
    },
    plugins: { react: reactPlugin, "react-hooks": reactHooks },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-undef": "error",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node.js globals
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        global: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        TextEncoder: "readonly",
        self: "readonly",
        URL: "readonly",
        fetch: "readonly",
      },
    },
  },
  {
    files: ["*.config.js", "*.config.mjs", "playwright.config.js", "vite.config.js", "tailwind.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node.js globals for config files
        process: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },
  {
    files: ["tests/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Test globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        // Browser globals for tests
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        // Node.js globals
        process: "readonly",
        global: "readonly",
      },
    },
  },
];
