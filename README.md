# Safe Cert - Workplace Safety Got Upgraded

A comprehensive mobile safety platform built with React Native and Firebase that empowers industrial workers through accessible digital training, certification, and incident reporting.

**Learn. Certify. Protect.**

## Contributors / Team Members

- **[Thimeth Sathmika](URL)** 
- **[Hiruvinda ](URL)** 
- **[Dishan](URL)** 
- **[Ravindu Thiranjaya](URL)**


## The Problem We're Solving

SafeCert addresses critical challenges in industrial workplace safety:

1. **Limited Access to Training** - Workers lack convenient access to safety education
2. **Outdated Paper-Based Systems** - Inefficient manual certification and tracking
3. **Language Barriers** - Training materials not accessible to multilingual workforces
4. **Ineffective Incident Reporting** - Manual processes delay critical safety responses
5. **Unsafe Work Practices** - Lack of standardized, accessible safety protocols

## Target Users

### Primary Users
**Industrial Workers** - Main beneficiaries who access safety training, complete quizzes, and receive verified digital certificates through the mobile app.

### Secondary Users
**Training Specialists & Safety Officers** - Administrators and verifiers who manage training modules, approve certifications, and monitor safety compliance through the admin dashboard.

## Key Features

### Core Functionality
- **AI-Based Recommendations and Quizzes** - Personalized safety training powered by Google Gemini API.
- **Multi-Language Support** - Accessible training content in multiple languages (English, Sinhala, Tamil).
- **Text-to-Speech Feature** - Audio support for low-literacy users
- **Real-Time Incident Reporting** - Quick and efficient safety incident documentation with GPS tracking
- **Admin Dashboard** - Comprehensive management tools for trainers and safety officers
- **Digital Certification** - Verified, tamper-proof digital safety certificates

### Accessibility Features
- Optimized for bright and noisy industrial conditions
- Multi-language interface with text-to-speech
- User-first design for diverse literacy levels
- GPS-enabled accurate incident location tracking

## SDG Alignment

SafeCert promotes **SDG 8: Decent Work and Economic Growth** by:
- Protecting labor rights and promoting safe working environments for all workers
- Enabling accessibility and equity through inclusive design
- Improving workplace safety and certification transparency

## Tech Stack & Libraries

### Frontend
- **[React Native](https://reactnative.dev/)** – Cross-platform mobile development for Android and iOS
- **[Expo](https://expo.dev/)** (~54.0.10) – Development platform and build tool
- **[Expo Router](https://expo.github.io/router/)** (6.0.7) – File-based routing for React Native
- **[React Navigation](https://reactnavigation.org/)** – Navigation library with native stack, bottom tabs, and drawer
- **[Lucide React Native](https://lucide.dev/)** – Icon library
- **[React Native Paper](https://reactnativepaper.com/)** – Material Design components
- **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)** – Animation library
- **[Victory Native](https://commerce.nearform.com/open-source/victory-native/)** – Data visualization and charts
- **[React Native SVG](https://github.com/software-mansion/react-native-svg)** – SVG support

### Backend (BaaS)
- **[Firebase](https://firebase.google.com/)** (^12.3.0) – Backend as a Service
  - **Authentication** - User management and secure login
  - **Firestore** - Real-time NoSQL database for users, certificates, and reports
  - **Cloud Storage** - Secure file storage for training materials
  - **Real-time Sync** - Instant data updates across devices

### File & Media Handling
- **[Cloudinary](https://cloudinary.com/)** – Image and file storage for reports and certificates
- **[Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)** – Camera and gallery access
- **[Expo Document Picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)** – Document selection
- **[Expo Media Library](https://docs.expo.dev/versions/latest/sdk/media-library/)** – Media management
- **[PDF-Lib](https://pdf-lib.js.org/)** – PDF generation for certificates

### AI Integration
- **[Google Gemini API](https://ai.google.dev/)** (@google/genai) – Generates personalized safety quizzes and training recommendations

### Location & Audio Services
- **[Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)** – GPS integration for accurate incident tracking
- **[Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/)** – Text-to-speech functionality
- **[Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)** – Audio/video playback

### Additional Features
- **[Async Storage](https://react-native-async-storage.github.io/async-storage/)** – Local data persistence
- **[Expo Localization](https://docs.expo.dev/versions/latest/sdk/localization/)** – Multi-language support
- **[Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)** – Tactile feedback
- **[Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)** – Share certificates and reports

### Development Tools
- **[Expo Go](https://expo.dev/go)** – Testing and debugging environment for mobile builds
- **[TypeScript](https://www.typescriptlang.org/)** (~5.9.2) – Type-safe development
- **[ESLint](https://eslint.org/)** – Code quality and consistency
- **Figma** – UI/UX design

### UI/UX Testing
- **Cognitive Load Assessment** - Interface designed to minimize mental effort required to complete tasks
- Optimized information architecture for intuitive navigation
- Reduced visual clutter and simplified workflows for industrial environments
- Context-appropriate design patterns for high-stress situations

### Performance Metrics
- **Task Completion Rate** - 85% success across primary and secondary users
- **Reporting Efficiency** - Average incident reporting time reduced from 15 minutes to 5 minutes
- **User Satisfaction** - Positive feedback on accessibility features and ease of use
