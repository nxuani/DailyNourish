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
4. Start the app
   ```
   npx expo start
   ```
5. Scan the QR code that appears with the **Expo Go** app on your phone (or press `i` to open an iOS simulator, if you have Xcode installed) to see the app running.
6. A few keys/settings will need to be added to a `.env` file before things work fully (Supabase and FatSecret keys). These will be shared with the team separately rather than committed to GitHub.

## Structure
A quick look at how the project is organized:

```
/src
  /screens       # the actual app screens the user sees (login, meal plan, profile, etc.)
  /components    # smaller reusable pieces used across screens
  /navigation    # controls how users move between screens
  /services      # code that talks to Supabase and the FatSecret API
  /constants     # shared values used across the app

/docs            # research notes, planning docs, and other write-ups
```

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
