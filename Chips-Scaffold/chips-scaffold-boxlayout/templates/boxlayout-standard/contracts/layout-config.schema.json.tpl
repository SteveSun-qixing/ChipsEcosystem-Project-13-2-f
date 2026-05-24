{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "{{ DISPLAY_NAME }} layout config",
  "type": "object",
  "required": ["schemaVersion", "props", "assetRefs"],
  "properties": {
    "schemaVersion": {
      "type": "string"
    },
    "props": {
      "type": "object",
      "required": ["sortMode", "background", "topRegion"],
      "properties": {
        "sortMode": {
          "type": "string",
          "enum": ["manual", "name-asc", "name-desc"]
        },
        "background": {
          "$ref": "#/$defs/frameRegion"
        },
        "topRegion": {
          "$ref": "#/$defs/frameRegion"
        }
      }
    },
    "assetRefs": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^assets\\/[^\\\\:?#\\/]+(?:\\/[^\\\\:?#\\/]+)*$",
        "not": {
          "anyOf": [
            { "pattern": "(^|/)\\.($|/)" },
            { "pattern": "(^|/)\\.\\.($|/)" }
          ]
        }
      }
    }
  },
  "$defs": {
    "frameRegion": {
      "type": "object",
      "required": ["mode"],
      "properties": {
        "mode": {
          "type": "string",
          "enum": ["none", "image", "html"]
        },
        "assetPath": {
          "type": "string",
          "pattern": "^assets\\/[^\\\\:?#\\/]+(?:\\/[^\\\\:?#\\/]+)*$",
          "not": {
            "anyOf": [
              { "pattern": "(^|/)\\.($|/)" },
              { "pattern": "(^|/)\\.\\.($|/)" }
            ]
          }
        },
        "html": {
          "type": "string"
        }
      }
    }
  }
}
