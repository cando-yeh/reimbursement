import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";

const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
const tsRecommended = tseslint.configs["flat/recommended"].map((config) => ({
  ...config,
  files: tsFiles,
}));

export default [
  {
    ignores: ["**/.next/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tsRecommended,
  {
    files: ["**/*.{jsx,tsx}"],
    ...react.configs.flat.recommended,
  },
  {
    files: ["**/*.{jsx,tsx}"],
    ...react.configs.flat["jsx-runtime"],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "off",
      "react/prop-types": "off",
      "no-control-regex": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["update_admin.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        console: "readonly",
        process: "readonly",
      },
      sourceType: "script",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
