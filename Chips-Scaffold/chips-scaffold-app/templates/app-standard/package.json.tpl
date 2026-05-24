{
  "name": "{{ PROJECT_NAME }}",
  "version": "{{ VERSION }}",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "chipsdev server",
    "build": "chipsdev build",
    "test": "chipsdev test",
    "lint": "chipsdev lint",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "validate": "chipsdev validate",
    "preview:smoke": "chipsdev preview --mode mock --target app --json --out reports/preview/app-preview-smoke.json && node src/preview/preview-smoke.js",
    "quality:gate": "chipsdev quality gate --json --out reports/quality/quality-gate.json",
    "verify": "npm run lint && npm run typecheck && npm test && npm run build && npm run validate && npm run preview:smoke && npm run quality:gate"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@chips/component-library": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.5.0",
    "eslint": "^8.57.1",
    "@typescript-eslint/parser": "^7.18.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "chips-sdk": "^0.1.0"
  }
}
