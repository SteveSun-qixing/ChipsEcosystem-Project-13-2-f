{
  "app": {
    "identity": {
      "displayName": "{{ DISPLAY_NAME }}"
    },
    "shell": {
      "subtitle": "App workspace",
      "languageSwitch": "Switch to {locale}",
      "navigationLabel": "App scenes",
      "contentLabel": "Main content",
      "detailLabel": "Runtime environment",
      "ready": "Runtime environment is ready",
      "loading": "Reading runtime environment"
    },
    "scenes": {
      "main": {
        "title": "Workspace",
        "description": "Current app scene and view state"
      },
      "settings": {
        "title": "Settings",
        "description": "App preferences and environment state"
      }
    },
    "commands": {
      "sectionTitle": "Commands",
      "openWorkspace": {
        "title": "Open workspace",
        "description": "Focus the main app scene",
        "ariaLabel": "Open workspace"
      },
      "refreshTheme": {
        "title": "Refresh theme status",
        "description": "Read the current Host theme state again",
        "ariaLabel": "Refresh theme status"
      },
      "menu": {
        "app": "App",
        "ariaLabel": "Application command menu"
      },
      "toolbar": {
        "ariaLabel": "Main toolbar"
      },
      "palette": {
        "searchPlaceholder": "Search commands",
        "ariaLabel": "Command palette"
      },
      "status": {
        "idle": "Command system is waiting",
        "registering": "Registering commands",
        "ready": "Commands registered",
        "error": "Command runtime needs attention",
        "lastInvoked": "Last invoked: {commandId} from {source}",
        "errorWithCode": "Command error: {code}"
      }
    },
    "workspace": {
      "overviewTitle": "Runtime overview",
      "overviewDescription": "The app runs through Host surface, SDK, and the component library.",
      "formTitle": "State binding",
      "formDescription": "Input state is maintained by the component library state model.",
      "formLabel": "Title",
      "formPlaceholder": "Enter an in-app title",
      "formAction": "Update state",
      "listTitle": "Scene list",
      "listDescription": "Scene definitions are maintained by the app registry.",
      "emptyTitle": "No diagnostics",
      "emptyDescription": "There are no runtime diagnostics to address.",
      "emptyAction": "Refresh diagnostics",
      "environmentTitle": "Host environment",
      "themeLabel": "Current theme",
      "localeLabel": "Current locale",
      "surfaceLabel": "Current surface",
      "permissionLabel": "Command permission",
      "diagnosticsLabel": "Diagnostics",
      "permissionReady": "Command ready",
      "permissionMissing": "Missing command.invoke",
      "unknown": "Unknown",
      "error": "Environment read error: {code}"
    },
    "errors": {
      "boundaryTitle": "App runtime error",
      "boundaryDescription": "The runtime boundary caught an error.",
      "retry": "Retry"
    }
  }
}
