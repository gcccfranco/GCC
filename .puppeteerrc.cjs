// Puppeteer n'arrive ici que par @mermaid-js/mermaid-cli (docs:diagrammes).
// Sans ce réglage, son installation télécharge un Chrome à chaque `npm ci`,
// y compris sur Vercel et dans la CI. Les diagrammes se rendent avec le
// Chromium de Playwright (voir scripts/diagrammes/generer.mjs).
module.exports = { skipDownload: true };
