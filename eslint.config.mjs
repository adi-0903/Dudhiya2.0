import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    rules: {
      'no-console': ['error', { allow: [] }],
    }
  },
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
];
