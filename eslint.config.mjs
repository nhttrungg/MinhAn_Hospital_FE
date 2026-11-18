import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name=/^(button|input|select|textarea|form|label|fieldset|legend|table|thead|tbody|tr|th|td|details|summary)$/], JSXSelfClosingElement[name.name=/^(button|input|select|textarea|form|label|fieldset|legend|table|thead|tbody|tr|th|td|details|summary)$/]",
          message: "Use the shared UI components for controls, forms, tables and disclosures.",
        },
        {
          selector:
            "JSXAttribute[name.name='role'] > Literal[value=/^(tablist|tab|alert|status)$/]",
          message: "Use Tabs, InlineStatus, Notice or the shared query state components.",
        },
        {
          selector:
            "JSXOpeningElement[name.name=/^(Link|a)$/] > JSXAttribute[name.name='className'] > Literal[value=/(at-button|public-button|public-text-link)/]",
          message: "Use ButtonLink for navigation actions.",
        },
      ],
    },
  },
  {
    files: ["src/app/**/page.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name=/^[a-z]/], JSXSelfClosingElement[name.name=/^[a-z]/]",
          message:
            "Keep route pages thin: compose or export a screen component from src/components.",
        },
        {
          selector: "ExpressionStatement[directive='use client']",
          message:
            "Keep client behavior inside screen components; route pages compose those components.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
