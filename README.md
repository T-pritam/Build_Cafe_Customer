# BuildCafeCustomer

> Scan a table QR, browse the menu, and track your order in real time — a mobile-first cafe ordering app built for speed and simplicity.

![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C4887?style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

---

## Demo

<!-- TODO: Add screenshots — home screen, menu grid, cart, order tracking, rewards -->
> Screenshots coming soon. Contact the author for a live demo.

---

## Features

- **QR-based table sessions** — scan a table QR code to instantly start a named session and access the full menu
- **Real-time order tracking** — live status updates from kitchen preparation through to delivery, powered by Supabase Realtime
- **Integrated payments** — Razorpay checkout embedded in the order flow with receipt confirmation
- **Reward points system** — earn and redeem points across visits; current balance visible at all times
- **Modifier-aware cart** — menu items support customisation options (size, extras, exclusions) before checkout
- **OTP authentication** — phone-number login with one-time password, no password required
- **Push notifications** — Firebase FCM alerts for every order status change
- **Order history** — full history with item-level feedback and star ratings
- **Session continuity** — resume an existing session after app restart

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.85.2 |
| Language | TypeScript 5.8 |
| Navigation | React Navigation (native-stack, bottom-tabs) |
| State Management | Zustand 5.0 |
| Backend / Realtime | Supabase + Axios |
| Payments | Razorpay React Native SDK |
| Push Notifications | Firebase Cloud Messaging + Notifee |
| Camera / QR Scanner | react-native-vision-camera |
| Local Storage | AsyncStorage |
| Env Config | react-native-config |

---

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android) or Xcode 14+ (for iOS)
- A running instance of [BuildCafeBackend](../BuildCafeBackend)

### Installation

```bash
git clone https://github.com/T-pritam/Build_Cafe_Customer.git
cd Build_Cafe_Customer
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
API_BASE_URL=https://your-backend-url.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

Place `google-services.json` (Android) in `android/app/` and `GoogleService-Info.plist` (iOS) in `ios/customer/`.

---

## Usage

**Start the Metro bundler:**

```bash
npx react-native start
```

**Run on Android:**

```bash
npx react-native run-android
```

**Run on iOS:**

```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

---

## Project Structure

```
Build_Cafe_Customer/
├── src/
│   ├── screens/          # auth/, main/, shared/ — Auth, Menu, Cart, Orders, Rewards, Profile, QR scanner, etc.
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Root, Auth, and Main navigators
│   ├── store/            # Zustand stores (auth, cart, activeOrder)
│   ├── services/         # api.ts (Axios), supabase.ts, fcm.ts
│   ├── hooks/            # Custom React hooks (push requests, session heartbeat)
│   ├── theme/            # Theme tokens
│   ├── types/            # Ambient/module type declarations
│   ├── utils/            # Helpers (QR parsing, fingerprint)
│   └── assets/           # Images, icons
├── android/              # Android native project
├── ios/                  # iOS native project
└── package.json
```

---

## Contributing

This is a proprietary project. Contributions are not open to the public. If you are a team member, open an internal pull request with a clear description of your changes and the problem being solved.

---

## License

© 2024 T Pritam. All rights reserved.  
This software is proprietary. No license is granted to use, copy, modify, or distribute without explicit written permission from the author.

---

## Author

**T Pritam**  
[GitHub](https://github.com/T-pritam) · [LinkedIn](https://www.linkedin.com/in/t-pritam)
