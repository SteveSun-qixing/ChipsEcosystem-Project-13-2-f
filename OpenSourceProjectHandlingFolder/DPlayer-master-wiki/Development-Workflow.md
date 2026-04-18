# Development Workflow

> **Relevant source files**
> * [.gitignore](https://github.com/DIYgod/DPlayer/blob/f00e304c/.gitignore)
> * [.husky/pre-commit](https://github.com/DIYgod/DPlayer/blob/f00e304c/.husky/pre-commit)
> * [.prettierignore](https://github.com/DIYgod/DPlayer/blob/f00e304c/.prettierignore)
> * [.prettierrc](https://github.com/DIYgod/DPlayer/blob/f00e304c/.prettierrc)
> * [.travis.yml](https://github.com/DIYgod/DPlayer/blob/f00e304c/.travis.yml)
> * [docs/.vuepress/styles/index.styl](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/.vuepress/styles/index.styl)
> * [docs/.vuepress/styles/palette.styl](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/.vuepress/styles/palette.styl)
> * [pnpm-lock.yaml](https://github.com/DIYgod/DPlayer/blob/f00e304c/pnpm-lock.yaml)

This page describes the development workflow for the DPlayer project, including setting up the development environment, building the project, code quality tools, and contributing to the codebase. For information about the webpack configuration, see [Webpack Configuration](/DIYgod/DPlayer/4.1-webpack-configuration).

## Environment Setup

### Prerequisites

Before you begin development on DPlayer, you'll need the following tools installed:

* **Node.js** (LTS version recommended)
* **pnpm** (preferred package manager for this project)

### Setting Up the Development Environment

1. **Clone the repository** ``` git clone https://github.com/DIYgod/DPlayer.gitcd DPlayer ```
2. **Install dependencies** ``` pnpm install ```

Sources: [pnpm-lock.yaml L1-L118](https://github.com/DIYgod/DPlayer/blob/f00e304c/pnpm-lock.yaml#L1-L118)

## Development Build System

DPlayer uses Webpack as its build system, with a comprehensive setup for development and production environments.

### Build Workflow

```mermaid
flowchart TD

src_js["JavaScript (src/js/)"]
src_css["CSS/Less (src/css/)"]
src_template["Templates (src/template/)"]
src_assets["Assets (src/assets/)"]
webpack["Webpack"]
babel["Babel"]
postcss["PostCSS"]
less["Less"]
template_loader["Art Template Loader"]
dist_dev["DPlayer.js"]
dist_prod["DPlayer.min.js"]
dist_map["DPlayer.min.js.map"]

src_js --> webpack
src_css --> webpack
src_template --> webpack
src_assets --> webpack
babel --> dist_dev
postcss --> dist_dev
less --> dist_dev
template_loader --> dist_dev

subgraph subGraph2 ["Output Files"]
    dist_dev
    dist_prod
    dist_map
    dist_dev --> dist_prod
end

subgraph subGraph1 ["Build Process"]
    webpack
    babel
    postcss
    less
    template_loader
    webpack --> babel
    webpack --> postcss
    webpack --> less
    webpack --> template_loader
end

subgraph subGraph0 ["Source Files"]
    src_js
    src_css
    src_template
    src_assets
end
```

Sources: [pnpm-lock.yaml L18-L117](https://github.com/DIYgod/DPlayer/blob/f00e304c/pnpm-lock.yaml#L18-L117)

### Build Commands

DPlayer provides several npm scripts for different build scenarios:

| Command | Description |
| --- | --- |
| `pnpm build` | Builds production-ready files |
| `pnpm dev` | Builds development version and watches for changes |
| `pnpm demo` | Starts development server with demo page |

Sources: [.travis.yml L4-L6](https://github.com/DIYgod/DPlayer/blob/f00e304c/.travis.yml#L4-L6)

## Code Quality Tools

DPlayer maintains code quality through automated tools and pre-commit hooks.

### Prettier Configuration

Code formatting is enforced using Prettier with the following configuration:

```mermaid
flowchart TD

config[".prettierrc"]
ignore[".prettierignore"]
husky["Husky Pre-commit Hook"]
lint_staged["lint-staged"]
formatting["Code Formatting"]

lint_staged --> formatting

subgraph subGraph0 ["Prettier Setup"]
    config
    ignore
    husky
    lint_staged
    config --> husky
    ignore --> husky
    husky --> lint_staged
end
```

Sources: [.prettierrc L1-L7](https://github.com/DIYgod/DPlayer/blob/f00e304c/.prettierrc#L1-L7)

 [.prettierignore L1-L2](https://github.com/DIYgod/DPlayer/blob/f00e304c/.prettierignore#L1-L2)

 [.husky/pre-commit L1-L5](https://github.com/DIYgod/DPlayer/blob/f00e304c/.husky/pre-commit#L1-L5)

The project uses the following Prettier settings:

| Setting | Value |
| --- | --- |
| Print Width | 233 characters |
| Tab Width | 4 spaces |
| Quote Style | Single quotes |
| Trailing Comma | ES5 |
| Arrow Parentheses | Always |

Sources: [.prettierrc L1-L7](https://github.com/DIYgod/DPlayer/blob/f00e304c/.prettierrc#L1-L7)

## Continuous Integration

DPlayer uses Travis CI for continuous integration and automated deployment of documentation.

### CI/CD Pipeline

```mermaid
flowchart TD

pr["Pull Request"]
master["Master Branch"]
build["Build: npm run build"]
docs_build["Docs: npm run docs:build"]
deploy["Deploy to GitHub Pages"]

pr --> build
pr --> docs_build
master --> build
master --> docs_build

subgraph subGraph0 ["Travis CI"]
    build
    docs_build
    deploy
    docs_build --> deploy
end
```

Sources: [.travis.yml L1-L14](https://github.com/DIYgod/DPlayer/blob/f00e304c/.travis.yml#L1-L14)

Travis CI configuration includes:

* Building the project with `npm run build`
* Building documentation with `npm run docs:build`
* Deploying documentation to GitHub Pages when merging to master

## Documentation Development

DPlayer uses VuePress for documentation, which allows for easy writing and maintenance of docs.

### Documentation Workflow

```mermaid
flowchart TD

markdown["Markdown Files"]
vuepress["VuePress"]
build["npm run docs:build"]
dev["npm run docs:dev"]
html["Static HTML"]
github_pages["GitHub Pages"]
local["Local Preview"]

markdown --> vuepress
vuepress --> build
vuepress --> dev
build --> html
dev --> local

subgraph Output ["Output"]
    html
    github_pages
    html --> github_pages
end
```

Sources: [docs/.vuepress/styles/index.styl L1-L48](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/.vuepress/styles/index.styl#L1-L48)

 [docs/.vuepress/styles/palette.styl L1-L2](https://github.com/DIYgod/DPlayer/blob/f00e304c/docs/.vuepress/styles/palette.styl#L1-L2)

 [.travis.yml L6-L13](https://github.com/DIYgod/DPlayer/blob/f00e304c/.travis.yml#L6-L13)

The documentation can be customized via:

* Custom styles in `docs/.vuepress/styles/index.styl`
* Color palette in `docs/.vuepress/styles/palette.styl`

## Dependency Management

DPlayer uses pnpm for dependency management, which provides faster installation and better disk space efficiency.

### Key Dependencies

```mermaid
flowchart TD

webpack["webpack"]
babel["@babel/core"]
less["less/less-loader"]
postcss["postcss"]
prettier["prettier"]
husky["husky"]
lint_staged["lint-staged"]
vuepress["@vuepress/plugin-pwa"]
dplayer["DPlayer"]

dplayer --> webpack
dplayer --> babel
dplayer --> less
dplayer --> postcss
dplayer --> prettier
dplayer --> husky
dplayer --> lint_staged
dplayer --> vuepress

subgraph Documentation ["Documentation"]
    vuepress
end

subgraph subGraph1 ["Code Quality"]
    prettier
    husky
    lint_staged
end

subgraph subGraph0 ["Build Tools"]
    webpack
    babel
    less
    postcss
end
```

Sources: [pnpm-lock.yaml L7-L117](https://github.com/DIYgod/DPlayer/blob/f00e304c/pnpm-lock.yaml#L7-L117)

## Git Workflow

### Git Configuration

The repository includes configurations to ignore certain files and directories:

* `.idea` (IntelliJ IDE files)
* `node_modules` (dependencies)
* Build artifacts and logs
* VS Code settings (`.vscode`)
* Generated documentation (`docs/.vuepress/dist`)

Sources: [.gitignore L1-L10](https://github.com/DIYgod/DPlayer/blob/f00e304c/.gitignore#L1-L10)

### Pre-commit Hooks

Pre-commit hooks are managed by Husky and lint-staged to ensure code quality:

1. Staged files are checked using lint-staged
2. Code formatting is applied with Prettier

Sources: [.husky/pre-commit L1-L5](https://github.com/DIYgod/DPlayer/blob/f00e304c/.husky/pre-commit#L1-L5)

## Release Process

When releasing a new version of DPlayer:

1. Update version number in package files
2. Build the production version
3. Build documentation
4. Commit and tag the release
5. Push to GitHub (which triggers CI/CD)

The CI/CD process will automatically deploy the updated documentation to GitHub Pages.

Sources: [.travis.yml L1-L14](https://github.com/DIYgod/DPlayer/blob/f00e304c/.travis.yml#L1-L14)

## Development Server

For local development and testing, DPlayer includes a webpack-dev-server configuration that serves the demo page.

```mermaid
flowchart TD

source["Source Files"]
webpack_dev["webpack-dev-server"]
browser["Browser"]

source --> webpack_dev
webpack_dev --> browser
browser --> webpack_dev
```

The development server:

* Watches for file changes and rebuilds automatically
* Provides hot module replacement for faster development
* Serves the demo pages for testing

Sources: [pnpm-lock.yaml L110-L117](https://github.com/DIYgod/DPlayer/blob/f00e304c/pnpm-lock.yaml#L110-L117)