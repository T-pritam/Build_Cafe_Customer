# Firebase Setup Guide — Build Cafe Customer App

## Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it `build-cafe` (or similar)
4. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Add Android App

1. In the Firebase console, click the **Android** icon (</> → Android)
2. Fill in:
   - **Android package name**: `com.customer` ← check your `android/app/build.gradle` (`applicationId`)
   - **App nickname**: `Build Cafe Customer`
   - **Debug signing certificate SHA-1**: optional for now
3. Click **Register app**
4. Download `google-services.json`
5. Place it at:
   ```
   android/app/google-services.json
   ```
   (replace the placeholder already there)

---

## Step 3 — Add iOS App

1. Click **Add app** → iOS icon
2. Fill in:
   - **iOS bundle ID**: check `ios/customer.xcodeproj/project.pbxproj` for `PRODUCT_BUNDLE_IDENTIFIER`
   - **App nickname**: `Build Cafe Customer iOS`
3. Click **Register app**
4. Download `GoogleService-Info.plist`
5. Place it at:
   ```
   ios/customer/GoogleService-Info.plist
   ```
6. Open Xcode → right-click the `customer` group → **Add Files to "customer"** → select `GoogleService-Info.plist`
   - Make sure **Copy items if needed** is checked

---

## Step 4 — Enable Cloud Messaging

1. In Firebase console, go to **Project Settings** → **Cloud Messaging** tab
2. For Android: FCM is enabled by default — no extra step needed
3. For iOS: upload your **APNs Authentication Key** or **APNs Certificate**
   - Go to [Apple Developer](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Keys**
   - Create a key with **Apple Push Notifications service (APNs)** enabled
   - Download the `.p8` key and upload it in Firebase → Cloud Messaging → iOS app config

---

## Step 5 — Find Your FCM Token (Dev)

Once `google-services.json` is in place and the app runs:

1. Open **Metro / logcat** in Android Studio or run:
   ```bash
   adb logcat | grep "FCM Token"
   ```
2. The token is logged after notification permission is granted:
   ```
   FCM Token: <your-long-token-here>
   ```

To send a test notification from Firebase:
1. Firebase console → **Engage** → **Messaging** → **New campaign** → **Firebase Notification Messages**
2. Compose message → **Send test message** → paste the FCM token → **Test**

---

## TODO — App Icon / Logo

- [ ] Replace `build-logo.png` at the project root with the final production-ready logo when ready
- [ ] Run the resize script (or re-run the setup) to regenerate mipmap icons at all densities
- [ ] For iOS app icon: use Xcode → `Assets.xcassets` → `AppIcon` → drag in the logo at required sizes (or use a tool like [MakeAppIcon](https://makeappicon.com))

---

## File Checklist

| File | Status |
|------|--------|
| `android/app/google-services.json` | ⚠️ Replace placeholder with real file |
| `ios/customer/GoogleService-Info.plist` | ⚠️ Add after creating iOS app in Firebase |
| `android/app/src/main/res/mipmap-*/ic_launcher.png` | ✅ Generated from build-logo.png |
| `android/app/src/main/res/drawable-*/ic_notification.png` | ✅ White-on-transparent notification icon |
