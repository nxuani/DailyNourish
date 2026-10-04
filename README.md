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

```
/src
  /app           # the app's screens — see note below
  /components    # smaller reusable pieces used across screens
  /constants     # shared values used across the app
  /hooks         # custom reusable logic (not UI)
  global.css     # shared app-wide styling

/docs            # research notes, planning docs, and other write-ups
```
**About `/app`:** every file inside this folder automatically becomes a screen in the app — so instead of a separate "screens" folder and a separate file wiring up navigation, the two are combined here. For example:
- `index.tsx` → the Home screen
- `explore.tsx` → a second screen/tab
- `_layout.tsx` → controls the tab bar and overall navigation

To add a new screen (like Food Search), add a new file here (e.g. `food-search.tsx`) and connect it in `_layout.tsx`.

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
