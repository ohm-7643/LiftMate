# LiftMate

**A local AI-powered workout planner that uses Qwen3-8B to personalize practical gym sessions around a person’s goals, equipment and training priorities.**

LiftMate combines a deterministic workout planner with local open-weight AI. The planner protects the workout’s constraints; Qwen adds a limited layer of personalization and coaching.

## Why I Built This

LiftMate was built for a real friend who wanted a gym routine that felt personal and practical instead of another generic workout plan. The goal is to make a plan that respects the equipment, schedule and priorities someone actually has.

> **Friend’s feedback:** [TODO: Add the friend’s actual feedback here.]

## What LiftMate Does

- Collects a profile through personalized onboarding.
- Creates deterministic workouts from the saved profile.
- Selects exercises that match available equipment and muscle priorities.
- Lets a person start a workout, log sets and complete a session.
- Saves workout history and returns simple next-session progression recommendations.
- Tracks weekly consistency from saved workout sessions.
- Uses local Qwen3-8B for constrained exercise personalization and coaching context.
- Keeps a valid deterministic workout available when AI is unavailable or its response fails validation.

## The Interesting Part: AI + Deterministic Planning

1. LiftMate collects the user’s goals, experience, equipment, schedule and muscle priorities.
2. A deterministic planner creates a valid baseline workout using those constraints.
3. Local Qwen3-8B personalizes a limited part of the plan, such as choosing priority exercises from an allowed set and writing concise coaching context.
4. LiftMate validates the AI response against the exercise library, equipment and workout rules.
5. If local AI is unavailable or returns invalid data, LiftMate uses the deterministic workout.

**I deliberately didn’t let the LLM control the entire workout.** Exercise eligibility and training prescriptions stay within deterministic application rules. Qwen contributes constrained personalization and explanation.

## Why Open-Source AI

Local inference is a particularly good fit for this project because a person can run LiftMate, its SQLite database and Ollama on the same machine. In that setup, profile and workout data can stay local, there is no mandatory cloud AI dependency, and there are no per-request charges to a hosted AI API.

The model and prompts are inspectable, and the AI layer can be experimented with or swapped while keeping the deterministic constraints in place. Ollama provides a repeatable local runtime. Open models are not always the best choice for every application; here, local control and the ability to inspect the personalization step make them a useful fit.

## Why Qwen3-8B

Qwen3-8B is capable enough for the narrow personalization task LiftMate gives it, and it can run locally through Ollama. LiftMate intentionally limits how much it asks the model to generate, keeping its role accessible and reproducible while the application handles the hard workout rules.

## Features

- Multi-step onboarding for goals, experience, training days, session length, equipment and muscle priorities
- Curated exercise library
- Deterministic weekly split and workout planning
- Local Qwen workout personalization with validation and deterministic fallback
- Workout execution with set, weight, rep and optional RPE logging
- Saved workout history and completion summaries
- Deterministic next-session progression recommendations
- Weekly consistency summary

## Architecture

- **Frontend:** React + Vite
- **Backend:** Node.js + Express REST API
- **Database:** SQLite + `better-sqlite3`
- **AI:** Ollama + Qwen3-8B, running locally

```text
User
  → Profile and preferences (SQLite)
  → Deterministic planner creates a baseline
  → Local Qwen3-8B personalizes allowed exercise choices and coaching
  → LiftMate validates the AI result
  → Workout (or deterministic fallback)
  → Set logs and workout history (SQLite)
```

## How It Works

The user completes onboarding and saves a profile. LiftMate builds a workout using the profile and exercise library, then asks local Qwen for constrained personalization. The backend validates that response and falls back to the deterministic plan if needed. The user can start the reviewed workout, log each set and complete the session. LiftMate saves the session and uses logged performance for deterministic next-session recommendations.

## Local Setup

### Requirements

- Node.js and npm
- [Ollama](https://ollama.com/download)
- The `qwen3:8b` model for AI personalization

### Run the app

1. Install the JavaScript dependencies from the repository root:

   ```sh
   npm install
   ```

2. Install and start Ollama using its [official instructions](https://docs.ollama.com/quickstart). Pull the [Qwen3-8B model](https://ollama.com/library/qwen3%3A8b) used by LiftMate:

   ```sh
   ollama pull qwen3:8b
   ```

   This makes the model available locally; LiftMate does not download or manage it. Keep Ollama running locally. LiftMate’s default connection is `http://localhost:11434`.

3. Optional: copy `.env.example` to `.env` if you want to configure the backend’s Ollama connection. The available variables are `OLLAMA_BASE_URL` and `OLLAMA_MODEL`; their example values are `http://localhost:11434` and `qwen3:8b`.

4. Start the development API and frontend from the repository root:

   ```sh
   npm run dev
   ```

   Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend proxies `/api` requests to the Express server on `http://localhost:3000`.

The SQLite database is created under `server/data/` and exercises are seeded when the server starts. The database files are ignored by Git.

Without Ollama or Qwen, deterministic planning remains available, but local AI personalization will fall back.

### Useful commands

```sh
npm test             # Run the backend automated tests
npm run build        # Build the frontend for production
npm start            # Start the Express API
npm run seed:exercises  # Seed the exercise library
```

## Testing

The repository includes automated backend tests using Node’s built-in test runner. Run them with `npm test`. The frontend production build can be checked with `npm run build`. The normal test suite does not require Ollama to be online; AI calls are mocked in tests.

## Screenshots / Demo

- **Onboarding:** [Screenshot placeholder — add image here]
- **Training home:** [Screenshot placeholder — add image here]
- **Active workout:** [Screenshot placeholder — add image here]
- **Workout completion:** [Screenshot placeholder — add image here]
- **Demo video:** [Add demo video URL here]

## Limitations

- Local model inference can be slow on hardware without strong acceleration.
- AI is intentionally constrained; it does not generate an entire workout on its own.
- LiftMate is a prototype and personal fitness-planning project, not medical or professional fitness advice.
- A local setup keeps data on the same machine only when the app, SQLite database and Ollama are all run there.

## Future Improvements

- Add more workout-history views based on saved session data.
- Improve recommendations as more completed workout performance becomes available.
- Make it easier to resume an in-progress session after closing or refreshing the app.
- Evaluate additional local models while preserving the same validation boundary.
- Gather the friend’s real feedback and refine the experience around it.

## DEV Challenge

LiftMate was built for a real person as part of the DEV Hacktoberfest Weekend Challenge: **Build for a Friend**. Open-source AI is central to the experience: local Qwen3-8B adds constrained personalization, while deterministic application logic keeps the plan grounded in the person’s profile. Local-first inference was chosen so the model and data can stay under the user’s control when run on one machine.

> **Friend’s feedback:** [TODO: Add the friend’s actual feedback here.]

## License

This repository currently has no explicit license.
