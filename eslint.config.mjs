import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // `.claude/**` : skills vendorisés (code tiers, dont des `.cjs` pour
    // lesquels eslint-config-next n'enregistre pas ses plugins) ;
    // `graphify-out/**` : graphe généré.
    ignores: [".next/**", "node_modules/**", "public/sw.js", ".claude/**", "graphify-out/**"],
  },
  {
    // Même périmètre que celui où eslint-config-next enregistre ses plugins :
    // ailleurs (ex. un `.cjs`), une règle `react-hooks/*` ferait planter ESLint.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    // Règles « React Compiler » de react-hooks v7 : signal utile mais ~30
    // occurrences préexistantes — en warning le temps de refactorer.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      // `const { chordProSource: _, ...entry }` est l'idiome d'exclusion standard
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
];

export default eslintConfig;
