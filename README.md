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
| Mobile app | **Swift** (built with **Xcode**) | Native iOS only |
| Backend/Database | **Supabase** | Database, auth, and storage (User profiles, saved meal plans, and user preferences) |
| Meal plan/Recipe data | **FatSecret** | Generates meal plans and recipes/nutrition data |
| Auth | **Supabase** | Email/password |
| Version Control | **Github/Git** | See [Branching Guidelines](#branching-guidelines) |

## Setup
Instructions for getting the app running on your own computer:

1. Make sure you have **Xcode** installed (from the Mac App Store) — this is required to build and run the app, and only works on a Mac.
2. Clone the repository and go into the project folder
   ```
   git clone [repo-url]
   cd Daily_Nourish
   ```
3. Open the project in Xcode
   ```
   open Daily_Nourish.xcodeproj
   ```

## Structure
A quick look at how the project is organized:

```
/DailyNourish
  /Views         # the actual screens the user sees (login, meal plan, profile, etc.)
  /Models        # the shapes of our data (user, meal plan, recipe, etc.)
  /Services      # code that talks to Supabase and the FatSecret API
  /Resources     # images, colors, and other assets used in the app

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
