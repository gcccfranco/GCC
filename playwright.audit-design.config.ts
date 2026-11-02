// Config jetable de l'audit design du 02/11/2026 : la spec de captures sur les cinq dispositions.
import base from "./playwright.config";

export default {
  ...base,
  testMatch: /audit-design-captures\.spec\.ts/,
  retries: 0,
  projects: (base.projects ?? []).map((p) => ({ ...p, testMatch: /audit-design-captures\.spec\.ts/ })),
};
