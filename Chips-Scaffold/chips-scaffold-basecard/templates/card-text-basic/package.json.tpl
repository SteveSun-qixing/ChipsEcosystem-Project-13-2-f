{
  "name": "{{ PLUGIN_ID }}",
  "version": "{{ VERSION }}",
  "private": false,
  "type": "commonjs",
  "scripts": {
    "dev": "chips dev server",
    "build": "chips dev build",
    "test": "chips dev test",
    "lint": "chips dev lint",
    "validate": "chips dev validate"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "vitest": "^3.0.8"
  }
}

