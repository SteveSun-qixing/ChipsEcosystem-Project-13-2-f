# Build & Deployment

> **Relevant source files**
> * [.github/workflows/main.yml](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml)
> * [Dockerfile](https://github.com/edrlab/thorium-reader/blob/02b67755/Dockerfile)
> * [docker.sh](https://github.com/edrlab/thorium-reader/blob/02b67755/docker.sh)
> * [eslint.config.mjs](https://github.com/edrlab/thorium-reader/blob/02b67755/eslint.config.mjs)
> * [package-mac-skip-notarize_ARM64.sh](https://github.com/edrlab/thorium-reader/blob/02b67755/package-mac-skip-notarize_ARM64.sh)
> * [package-mac-skip-notarize_x64.sh](https://github.com/edrlab/thorium-reader/blob/02b67755/package-mac-skip-notarize_x64.sh)
> * [scripts/findImportedButNonInstalledNpmPackages.mjs](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/findImportedButNonInstalledNpmPackages.mjs)
> * [scripts/package-lock-patch.js](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/package-lock-patch.js)
> * [src/main/redux/sagas/keyboard.ts](https://github.com/edrlab/thorium-reader/blob/02b67755/src/main/redux/sagas/keyboard.ts)

This document covers the continuous integration, build matrix, packaging, and deployment pipeline for Thorium Reader. The system supports cross-platform builds for Windows, macOS, and Linux across both Intel and ARM architectures using GitHub Actions, Docker containerization, and Electron Builder.

For application architecture details, see [Application Architecture](/edrlab/thorium-reader/1.1-application-architecture). For information about the overall system overview, see [Overview](/edrlab/thorium-reader/1-overview).

## CI/CD Pipeline Overview

The build and deployment system uses GitHub Actions with a comprehensive build matrix to generate platform-specific distributables. The pipeline supports both pull request validation builds and full release builds with artifact publishing.

```mermaid
flowchart TD

push["Push to develop"]
matrix_build["Matrix Build Strategy"]
pr["Pull Request"]
windows_intel["windows-intel<br>windows-2025"]
windows_arm["windows-arm<br>windows-2025"]
macos_intel["macos-intel<br>macos-latest"]
macos_arm["macos-arm<br>macos-latest"]
linux_intel["linux-intel<br>ubuntu-22.04"]
linux_arm["linux-arm<br>ubuntu-22.04"]
npm_install_x64["npm ci --arch=x64"]
npm_install_arm64["npm ci --arch=arm64"]
package_intel["package:win/mac/linux"]
package_arm["package with --arm64 flag"]
exe_msi[".exe/.msi files"]
dmg_files[".dmg files"]
appimage_deb[".AppImage/.deb files"]
exe_msi_arm[".exe/.msi ARM64"]
dmg_arm[".dmg ARM64"]
appimage_deb_arm[".AppImage/.deb ARM64"]
github_release["GitHub Release Tags"]

matrix_build --> windows_intel
matrix_build --> windows_arm
matrix_build --> macos_intel
matrix_build --> macos_arm
matrix_build --> linux_intel
matrix_build --> linux_arm
windows_intel --> npm_install_x64
windows_arm --> npm_install_arm64
macos_intel --> npm_install_x64
macos_arm --> npm_install_arm64
linux_intel --> npm_install_x64
linux_arm --> npm_install_arm64
npm_install_x64 --> package_intel
npm_install_arm64 --> package_arm
package_intel --> exe_msi
package_intel --> dmg_files
package_intel --> appimage_deb
package_arm --> exe_msi_arm
package_arm --> dmg_arm
package_arm --> appimage_deb_arm
exe_msi --> github_release
dmg_files --> github_release
appimage_deb --> github_release
exe_msi_arm --> github_release
dmg_arm --> github_release
appimage_deb_arm --> github_release

subgraph subGraph5 ["Release Publishing"]
    github_release
end

subgraph Artifacts ["Artifacts"]
    exe_msi
    dmg_files
    appimage_deb
    exe_msi_arm
    dmg_arm
    appimage_deb_arm
end

subgraph Packaging ["Packaging"]
    package_intel
    package_arm
end

subgraph subGraph2 ["Build Process"]
    npm_install_x64
    npm_install_arm64
end

subgraph subGraph1 ["Build Matrix"]
    windows_intel
    windows_arm
    macos_intel
    macos_arm
    linux_intel
    linux_arm
end

subgraph subGraph0 ["GitHub Actions Triggers"]
    push
    matrix_build
    pr
    push --> matrix_build
    pr --> matrix_build
end
```

Sources: [.github/workflows/main.yml L31-L88](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L31-L88)

## Build Matrix Configuration

The GitHub Actions workflow defines a comprehensive build matrix covering all supported platforms and architectures. Each matrix entry specifies the runner OS, packaging command, and release tag.

| OS Architecture | Runner | Package Command | Release Tag |
| --- | --- | --- | --- |
| windows-intel | windows-2025 | `win` | latest-windows-intel |
| windows-arm | windows-2025 | `win` | latest-windows-arm |
| macos-intel | macos-latest | `mac:skip-notarize` | latest-macos-intel |
| macos-arm | macos-latest | `mac:skip-notarize` | latest-macos-arm |
| linux-intel | ubuntu-22.04 | `linux` | latest-linux-intel |
| linux-arm | ubuntu-22.04 | `linux` | latest-linux-arm |

The build process dynamically patches `package.json` to switch between `--x64` and `--arm64` flags based on the target architecture:

```mermaid
flowchart TD

matrix_osarch["matrix.osarch"]
endswith_arm["endsWith('-arm')"]
npm_arm["npm ci --arch=arm64 --cpu=arm64"]
npm_intel["npm ci --arch=x64 --cpu=x64"]
patch_arm["Replace --x64 with --arm64"]
patch_intel["Replace --arm64 with --x64"]
package_arm_build["npm run package:target"]
package_intel_build["npm run package:target"]

npm_arm --> patch_arm
npm_intel --> patch_intel
patch_arm --> package_arm_build
patch_intel --> package_intel_build

subgraph subGraph2 ["Electron Builder"]
    package_arm_build
    package_intel_build
end

subgraph subGraph1 ["Package.json Patching"]
    patch_arm
    patch_intel
end

subgraph subGraph0 ["Architecture Detection"]
    matrix_osarch
    endswith_arm
    npm_arm
    npm_intel
    matrix_osarch --> endswith_arm
    endswith_arm --> npm_arm
    endswith_arm --> npm_intel
end
```

Sources: [.github/workflows/main.yml L184-L228](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L184-L228)

 [.github/workflows/main.yml L64-L88](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L64-L88)

## Docker Containerization

Linux builds support Docker containerization for consistent build environments and glibc compatibility. The Docker setup uses Ubuntu 20.04 as the base image for maximum compatibility.

```mermaid
flowchart TD

docker_sh["docker.sh"]
arch_detect["uname -m == 'arm64'"]
platform_arm["--platform linux/arm64"]
platform_x64["--platform linux/amd64"]
dockerfile["Dockerfile<br>Ubuntu 20.04"]
base_setup["Base System Setup<br>Node.js 22, npm 11"]
build_deps["Build Dependencies<br>ruby-dev, fpm, build-essential"]
electron_deps["Electron Dependencies<br>libnotify4, libdrm2, etc."]
source_copy["COPY source files"]
npm_install_docker["npm i"]
electron_check["Electron version check"]
clean_build["npm run clean"]
package_linux["USE_SYSTEM_FPM=true npm run package:linux"]
artifacts["AppImage & DEB artifacts"]

electron_check --> clean_build

subgraph subGraph2 ["Build Execution"]
    clean_build
    package_linux
    artifacts
    clean_build --> package_linux
    package_linux --> artifacts
end

subgraph subGraph1 ["Source Preparation"]
    source_copy
    npm_install_docker
    electron_check
    source_copy --> npm_install_docker
    npm_install_docker --> electron_check
end

subgraph subGraph3 ["Architecture Support"]
    docker_sh
    arch_detect
    platform_arm
    platform_x64
    docker_sh --> arch_detect
    arch_detect --> platform_arm
    arch_detect --> platform_x64
end

subgraph subGraph0 ["Docker Build Process"]
    dockerfile
    base_setup
    build_deps
    electron_deps
    dockerfile --> base_setup
    base_setup --> build_deps
    build_deps --> electron_deps
end
```

The `docker.sh` script handles architecture detection and package.json patching for ARM64 builds:

Sources: [Dockerfile L1-L125](https://github.com/edrlab/thorium-reader/blob/02b67755/Dockerfile#L1-L125)

 [docker.sh L10-L134](https://github.com/edrlab/thorium-reader/blob/02b67755/docker.sh#L10-L134)

## Platform-Specific Build Scripts

### macOS Builds

Separate shell scripts handle Intel and ARM64 macOS builds with architecture-specific npm installations and package.json patching:

* `package-mac-skip-notarize_x64.sh` - Intel macOS builds
* `package-mac-skip-notarize_ARM64.sh` - ARM64 macOS builds

Both scripts follow the pattern:

1. Remove existing electron modules
2. Install with architecture-specific flags
3. Patch package.json for target architecture
4. Run packaging command

Sources: [package-mac-skip-notarize_x64.sh L1-L8](https://github.com/edrlab/thorium-reader/blob/02b67755/package-mac-skip-notarize_x64.sh#L1-L8)

 [package-mac-skip-notarize_ARM64.sh L1-L8](https://github.com/edrlab/thorium-reader/blob/02b67755/package-mac-skip-notarize_ARM64.sh#L1-L8)

## Build Tools and Configuration

### Version Patching

The CI pipeline uses Node.js scripts to patch version information and dependencies:

```mermaid
flowchart TD

package_patch1["package-ci-patch.js<br>Main package.json"]
package_patch2["package-ci-patch.js<br>src/package.json"]
lock_patch["package-lock-patch.js<br>SSH to HTTPS conversion"]
npm_cache["npm cache clean --force"]
npm_install_arch["Architecture-specific npm ci"]
electron_version["Electron version validation"]
build_process["Build/Package process"]

lock_patch --> npm_cache
npm_install_arch --> electron_version

subgraph Validation ["Validation"]
    electron_version
    build_process
    electron_version --> build_process
end

subgraph subGraph1 ["Dependency Management"]
    npm_cache
    npm_install_arch
    npm_cache --> npm_install_arch
end

subgraph subGraph0 ["Build Preparation"]
    package_patch1
    package_patch2
    lock_patch
    package_patch1 --> package_patch2
    package_patch2 --> lock_patch
end
```

The `package-lock-patch.js` script converts SSH Git URLs to HTTPS for CI compatibility:

Sources: [.github/workflows/main.yml L171-L179](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L171-L179)

 [scripts/package-lock-patch.js L1-L6](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/package-lock-patch.js#L1-L6)

### Electron Version Validation

The CI pipeline validates Electron binary architecture and version compatibility:

* Windows: Uses `dumpbin /headers` to verify binary architecture
* Linux: Uses `file` command to check binary format
* macOS: Validates Electron.app bundle architecture

Sources: [.github/workflows/main.yml L194-L210](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L194-L210)

## Release Publishing

### GitHub Release Management

The deployment process uses a custom Node.js script (`release-github.mjs`) to manage GitHub releases:

1. Delete existing release tags for the target platform
2. Create new release with build artifacts
3. Upload platform-specific binaries (.exe, .msi, .dmg, .AppImage, .deb)

```mermaid
flowchart TD

build_complete["Build Complete"]
release_script["scripts/release-github.mjs"]
delete_release["Delete existing release tag"]
create_release["Create new release"]
upload_artifacts["Upload build artifacts"]
latest_windows_intel["latest-windows-intel"]
latest_windows_arm["latest-windows-arm"]
latest_macos_intel["latest-macos-intel"]
latest_macos_arm["latest-macos-arm"]
latest_linux_intel["latest-linux-intel"]
latest_linux_arm["latest-linux-arm"]
exe_msi_intel[".exe/.msi"]
exe_msi_arm[".exe/.msi ARM64"]
dmg_intel[".dmg"]
dmg_arm[".dmg ARM64"]
linux_intel_files[".AppImage/.deb"]
linux_arm_files[".AppImage/.deb ARM64"]

upload_artifacts --> latest_windows_intel
upload_artifacts --> latest_windows_arm
upload_artifacts --> latest_macos_intel
upload_artifacts --> latest_macos_arm
upload_artifacts --> latest_linux_intel
upload_artifacts --> latest_linux_arm
latest_windows_intel --> exe_msi_intel
latest_windows_arm --> exe_msi_arm
latest_macos_intel --> dmg_intel
latest_macos_arm --> dmg_arm
latest_linux_intel --> linux_intel_files
latest_linux_arm --> linux_arm_files

subgraph subGraph2 ["Artifact Types"]
    exe_msi_intel
    exe_msi_arm
    dmg_intel
    dmg_arm
    linux_intel_files
    linux_arm_files
end

subgraph subGraph1 ["Release Tags"]
    latest_windows_intel
    latest_windows_arm
    latest_macos_intel
    latest_macos_arm
    latest_linux_intel
    latest_linux_arm
end

subgraph subGraph0 ["Release Process"]
    build_complete
    release_script
    delete_release
    create_release
    upload_artifacts
    build_complete --> release_script
    release_script --> delete_release
    delete_release --> create_release
    create_release --> upload_artifacts
end
```

### Build Environment Variables

Key environment variables control the build and release process:

* `GITHUB_TOKEN_RELEASE_PUBLISH` - GitHub token for release publishing
* `USE_HARD_LINKS` - Set to 'false' for Electron Builder compatibility
* `USE_SYSTEM_FPM` - Use system FPM for Linux packaging
* `RELEASE_TAG` - Target release tag for the build matrix entry

Sources: [.github/workflows/main.yml L231-L233](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L231-L233)

 [.github/workflows/main.yml L24-L29](https://github.com/edrlab/thorium-reader/blob/02b67755/.github/workflows/main.yml#L24-L29)

## Dependency Validation

The build system includes a comprehensive dependency validation script that ensures all imported packages are properly declared in package.json:

```mermaid
flowchart TD

scan_source["Scan source files<br>findImportedButNonInstalledNpmPackages.mjs"]
extract_imports["Extract import/require statements"]
filter_ignored["Filter ignored packages<br>(Node.js built-ins, dev tools)"]
compare_deps["Compare with package.json"]
missing_deps["Report missing dependencies"]
unused_deps["Report unused dependencies"]
validation_result["Exit code 1 or 0"]

compare_deps --> missing_deps
compare_deps --> unused_deps

subgraph subGraph1 ["Validation Results"]
    missing_deps
    unused_deps
    validation_result
    missing_deps --> validation_result
    unused_deps --> validation_result
end

subgraph subGraph0 ["Dependency Analysis"]
    scan_source
    extract_imports
    filter_ignored
    compare_deps
    scan_source --> extract_imports
    extract_imports --> filter_ignored
    filter_ignored --> compare_deps
end
```

The script identifies and reports:

* Packages imported but not in package.json dependencies
* Package.json dependencies not imported anywhere in the codebase
* Proper handling of scoped packages and Node.js built-ins

Sources: [scripts/findImportedButNonInstalledNpmPackages.mjs L1-L226](https://github.com/edrlab/thorium-reader/blob/02b67755/scripts/findImportedButNonInstalledNpmPackages.mjs#L1-L226)