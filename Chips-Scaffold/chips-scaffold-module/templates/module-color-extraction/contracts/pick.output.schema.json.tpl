{
  "type": "object",
  "required": ["backgroundColor", "accentColor", "palette", "metadata"],
  "properties": {
    "backgroundColor": {
      "type": "string",
      "pattern": "^#[0-9a-fA-F]{6}$"
    },
    "accentColor": {
      "type": "string",
      "pattern": "^#[0-9a-fA-F]{6}$"
    },
    "palette": {
      "type": "array",
      "minItems": 2,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["color", "role", "population", "lightness", "chroma"],
        "properties": {
          "color": {
            "type": "string",
            "pattern": "^#[0-9a-fA-F]{6}$"
          },
          "role": {
            "type": "string",
            "enum": ["background", "accent", "representative"]
          },
          "population": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "lightness": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "chroma": {
            "type": "number",
            "minimum": 0
          }
        },
        "additionalProperties": false
      }
    },
    "metadata": {
      "type": "object",
      "required": ["algorithm", "image", "sample"],
      "properties": {
        "algorithm": {
          "type": "string",
          "enum": ["byte-sampling-template-v1"]
        },
        "source": {
          "type": "object",
          "required": ["imagePath"],
          "properties": {
            "imagePath": {
              "type": "string",
              "minLength": 1
            },
            "sizeBytes": {
              "type": "number",
              "minimum": 0
            },
            "mtimeMs": {
              "type": "number",
              "minimum": 0
            }
          },
          "additionalProperties": false
        },
        "image": {
          "type": "object",
          "required": ["width", "height", "animated", "pageCount", "hasAlpha"],
          "properties": {
            "width": {
              "type": "integer",
              "minimum": 1
            },
            "height": {
              "type": "integer",
              "minimum": 1
            },
            "format": {
              "type": "string",
              "minLength": 1
            },
            "animated": {
              "type": "boolean"
            },
            "pageCount": {
              "type": "integer",
              "minimum": 1
            },
            "hasAlpha": {
              "type": "boolean"
            },
            "orientation": {
              "type": "integer"
            }
          },
          "additionalProperties": false
        },
        "sample": {
          "type": "object",
          "required": [
            "width",
            "height",
            "sampleSize",
            "visiblePixelRatio",
            "transparentPixelRatio",
            "clusterCount"
          ],
          "properties": {
            "width": {
              "type": "integer",
              "minimum": 1
            },
            "height": {
              "type": "integer",
              "minimum": 1
            },
            "sampleSize": {
              "type": "integer",
              "minimum": 48,
              "maximum": 160
            },
            "visiblePixelRatio": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "transparentPixelRatio": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "clusterCount": {
              "type": "integer",
              "minimum": 1,
              "maximum": 8
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
