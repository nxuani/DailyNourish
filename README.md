# Daily Nourish 🌱
#### CSE 4316-006: Senior Design I 
Najat Hussein | Tatenda Chireza | Lucia Guerrero | Angela Ayodeji | Natalie Tran


## Table of Contents
- [Overview](#overview)
- [Technologies](#technologies) 
- [Setup](#setup)
- [Structure](#structure)
- [Branching Guidelines](#branching-guidelines)

## Overview
Daily Nourish is a mobile app that creates a personalized nutritional planner based on the user's nutrition goals, dietary restrictions (e.g. vegetarian, keto), allergies, available ingredients, and target calories.

**Platform:** iOS

## Technologies
| Layer | Tech | Notes |
|---|---|---|
| Mobile app | **React Native** (via **Expo**) | Implementing iOS only, but can support cross-platform if added in future |
| Backend/Database | **Supabase** | Database, auth, and storage (User profiles, saved meal plans, and user preferences) |
| Meal plan/Recipe data | **FatSecret** | Generates meal plans and recipes/nutrition data |
| Auth | **Supabase** | Email/password |
| Version Control | **Github/Git** | See [Branching Guidelines](#branching-guidelines) |

## Setup
Instructions for getting the app running on your own computer:

1. Make sure you have **Node.js** installed on your computer.
2. Clone the repository and go into the project folder
   ```
   git clone [repo-url]
   cd [repo-name]
   ```
3. Install the project's dependencies
   ```
   npm install
   ```
4. Copy `.env.example` to a new file called `.env`, then fill in the real values (Supabase and FatSecret keys). These keys will be shared with the team separately.
   ```
   cp .env.example .env
   ```
5. Create a free account at [expo.dev](https://expo.dev) if you don't already have one (use your own personal email, not a shared one).
6. Sign in on your computer:
   ```
   npx expo login
   ```
7. Download the **Expo Go** app on your phone (App Store), open it, and sign in with the **same account** you just created.
8. Start the app
   ```
   npx expo start
   ```
9. Scan the QR code that appears with the **Expo Go** app on your phone (or press `i` to open an iOS simulator, if you have Xcode installed) to see the app running.

## Structure
A quick look at how the project is organized:

```text
/src
  /app
    _layout.tsx             # Root navigation
    index.tsx               # Welcome/Login screen
    profile-intake.tsx      # User profile questionnaire

    /(tabs)
      _layout.tsx           # Bottom tab navigation
      index.tsx             # Home screen
      plan.tsx              # Weekly meal plan
      pantry.tsx            # Pantry management
      meal-log.tsx          # Food and nutrition logging
      profile.tsx           # User profile

  /components
    /auth
      auth-preview.tsx      # Login/signup component
    placeholder-screen.tsx  # Reusable placeholder for unfinished screens
    themed-text.tsx         # Reusable themed text
    themed-view.tsx         # Reusable themed views

  /constants
    colors.ts               # Shared app color palette
    theme.ts                # Shared theme and spacing values

  /hooks                    # Custom reusable hooks

  /lib
    supabase.ts             # Supabase client configuration

  global.css                # Shared app-wide styling

/docs                       # Research, planning, and documentation
```

**About `/app`:**

Daily Nourish uses Expo Router, which means files inside the `app` folder define the application's screens and navigation.

- `index.tsx` — Welcome/Login screen.
- `profile-intake.tsx` — Collects user information, nutrition goals, allergies, and dietary preferences.
- `_layout.tsx` — Controls navigation between the Welcome screen, Profile Intake, and main application.
- `(tabs)/` — Contains the five main navigation tabs.

**Main Navigation Tabs:**

| Tab | File | Purpose |
|---|---|---|
| Home | `(tabs)/index.tsx` | Home screen and personalized greeting |
| Plan | `(tabs)/plan.tsx` | Weekly meal planning |
| Pantry | `(tabs)/pantry.tsx` | Pantry and ingredient management |
| Meal Log | `(tabs)/meal-log.tsx` | Food and nutrition tracking |
| Profile | `(tabs)/profile.tsx` | User profile and preferences |

The bottom navigation bar is configured in `(tabs)/_layout.tsx`.

**Important Notes for Development:**

- Some tabs currently use `placeholder-screen.tsx` until their features are implemented. Replace the placeholder in your assigned screen when developing that feature.
- Use the shared colors in `constants/colors.ts` to keep the app's cream-and-green theme consistent.
- `constants/theme.ts` contains additional shared styling values.
- Reusable UI components should be placed in `components/` instead of duplicating code across screens.
- When adding a new screen, create a `.tsx` file in the appropriate Expo Router folder. Only add it to `(tabs)/_layout.tsx` if it should appear in the bottom navigation.

## Branching Guidelines
To keep things organized while multiple people are working on the app at once:

- `main` - the stable, working version of the app
- `develop` - where everyone's finished work comes together before it's considered stable
- Create your own branch off of `develop` for whatever you're working on, and open a **Pull Request** when it's ready to be added back in
- All changes must go through a Pull Request into `develop` — no direct pushes
- **Minimum 1 approval** required before merging, so a teammate can look it over first

### Contributing
1. Pull the latest `develop` before starting new work
2. Create a branch off `develop` (e.g. `feature/login-screen`)
3. Commit your changes with a clear message describing what you did
4. Open a Pull Request into `develop` and tag a teammate to review it
5. Once approved, merge it in and delete the branch
