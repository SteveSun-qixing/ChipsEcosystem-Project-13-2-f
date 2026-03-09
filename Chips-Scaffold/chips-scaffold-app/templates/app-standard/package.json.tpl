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
    "validate": "chipsdev validate"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@chips/component-library": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "chips-sdk": "^0.1.0"
  }
}
