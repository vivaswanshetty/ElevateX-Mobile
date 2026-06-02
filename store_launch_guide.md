# ElevateX Mobile App: Google Play Store Submission Guide

This production guide walks you through compiling, signing, and submitting the ElevateX mobile app (`com.vivaswan.shetty.elevatex`) to the **Google Play Store** using the **Expo Application Services (EAS)** pipeline.

---

## Table of Contents
1. [Visual Asset Requirements](#1-visual-asset-requirements)
2. [Developer Account Setup](#2-developer-account-setup)
3. [EAS Production Setup (`eas.json`)](#3-eas-production-setup)
4. [EAS Credentials Provisioning](#4-eas-credentials-provisioning)
5. [Building Production Binaries](#5-building-production-binaries)
6. [Submitting to Play Console](#6-submitting-to-play-console)
7. [Deploying OTA Updates via EAS Update](#7-deploying-ota-updates-via-eas-update)

---

## 1. Visual Asset Requirements

Before submitting, prepare the required design assets for the store listing.

### App Icons & Splash Screens
Ensure the assets inside your `apps/mobile/assets` folder are high-quality, without transparency (for Android adaptive icons):
*   **App Icon (`icon.png`)**: `1024x1024 px`, PNG (no alpha channel).
*   **Android Adaptive Foreground (`adaptive-icon.png`)**: `1024x1024 px` PNG (foreground image centered with safe zones).
*   **Splash Screen (`splash.png`)**: `2048x2048 px` PNG.

### Google Play Store Screenshots
*   Minimum of 2 screenshots, max of 8.
*   JPEG or 24-bit PNG (no alpha).
*   Ratio 16:9 or 9:16. Minimum side of `320 px`, max side of `3840 px`.

---

## 2. Developer Account Setup

### Google Play Console Account
1. Sign up at [play.google.com/console](https://play.google.com/console) ($25 one-time registration fee).
2. Complete verification rules (identity, business registry).
3. Create your app record:
    *   Select **Create app**.
    *   Default language, select **App** (not Game), and **Free** (or Paid).
    *   Agree to Developer Program Policies and export laws.

---

## 3. EAS Production Setup

Your `eas.json` is located in the root of your mobile workspace (`apps/mobile/eas.json`). Make sure your production profile matches the following configuration for Play Store builds:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

> [!NOTE]
> Android production uses `"buildType": "app-bundle"` which outputs a `.aab` file. This format is mandatory for Google Play Store uploads and allows dynamic delivery sizes.

---

## 4. EAS Credentials Provisioning

Expo can automatically generate and manage signing credentials. Run this command from your terminal in the `apps/mobile` directory:

### Android Provisioning
Generate a Keystore file for release builds:
```bash
eas credentials
```
*   Select **Android** ➔ **production** ➔ **Set up credentials**.
*   EAS will generate a keystore file and back it up securely in the Expo dashboard.

---

## 5. Building Production Binaries

Run the production build command to let the EAS cloud compile your React Native app.

### For Android (`.aab` app bundle):
```bash
eas build --platform android --profile production
```

> [!TIP]
> You can monitor build progress directly in the terminal or click the Expo Dashboard URL output in the logs to see logs, status, and download links.

---

## 6. Submitting to Play Console

Once the EAS build completes, you can submit the compiled binary.

### Option A: Automatic Submission on Build Success
Add the `--auto-submit` flag to your build command to automatically push the compiled bundle to Google as soon as it builds successfully:
```bash
eas build --platform android --profile production --auto-submit
```

### Option B: Manual Trigger via EAS Submit
If you want to submit a pre-existing build:
```bash
# Submit Android build to Google Play Console (Internal/Production tracks)
eas submit --platform android
```

#### First-time Google Play Console Submit requirement:
Google Play requires a manual `.aab` upload for the very first release to configure the API credentials. Follow these steps:
1. Download the `.aab` file from the Expo build page.
2. Go to **Google Play Console** ➔ **App Releases** ➔ **Internal testing** (or Closed Testing).
3. Create a release and upload the `.aab` file manually.
4. Set up Service Account credentials to enable `eas submit` for subsequent releases.

---

## 7. Deploying OTA Updates via EAS Update

Because we migrated performance-sensitive assets and animations using pure JavaScript and React Native Reanimated, future updates to JS, styles, or images can bypass the lengthy store review process entirely!

### Initialize EAS Update
Run this once to link your project to EAS Update:
```bash
eas update:configure
```

### Deploying a Hotfix
To publish a live hotfix to production:
```bash
eas update --branch production --message "Fix follower list loading and UI glitch"
```

> [!IMPORTANT]
> EAS OTA updates are strictly compatible only if the native module dependencies remain unchanged. If you add a new native package or change `app.json` configuration, you must build and release a new store binary (re-run `eas build` and submit).
