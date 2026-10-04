# LiftMate

## Project

LiftMate is a personalized AI gym partner built for the Hacktoberfest 2026
"Build for a Friend" challenge.

The application should solve a real workout-planning problem for one real
person using open-source AI as a meaningful part of the system.

## Core Idea

LiftMate generates and adapts workouts based on:

- User goals
- Training experience
- Available equipment
- Training schedule
- Session duration
- Muscle priorities
- Previous workout performance
- Reps
- Weight
- RPE
- Recent training history

The application should NOT be a generic AI chatbot or generic workout generator.

## AI

Use a locally running open-weight model through Ollama.

Initial model target:
Qwen3-8B

The AI should be responsible for:

- Personalization
- Workout reasoning
- Explanations
- Conversational coaching
- Adaptive recommendations

Do NOT allow the LLM to blindly invent the entire workout.

Use deterministic application logic and exercise data for:

- Exercise selection constraints
- Training constraints
- Progression calculations
- Validation

## Architecture

### Frontend

- React
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express

### Database

- SQLite

### AI

- Ollama
- Qwen3-8B

## Core Features

1. User onboarding
2. Exercise database
3. Personalized workout generation
4. Workout logging
5. Progressive overload
6. Adaptive workout generation
7. AI explanation
8. Progress dashboard
9. AI Coach

## Development Rules

- Keep the architecture simple.
- Do not add unnecessary dependencies.
- Do not build features that are not required.
- Keep frontend and backend separated.
- Use REST APIs.
- Validate all API input.
- Handle errors properly.
- Never hardcode secrets.
- Never put API keys in frontend code.
- Keep AI responses structured JSON where possible.
- Write reusable components.
- Test every feature before moving to the next stage.
- Do not rewrite working code unnecessarily.

## Safety

LiftMate is a fitness planning assistant, not a medical device.

It must not diagnose injuries or medical conditions.

If a user reports pain or possible injury, the application should avoid
prescribing treatment and recommend appropriate professional evaluation.

## Development Approach

Build incrementally.

Do NOT implement the entire application in one task.

Every feature must:

1. Be implemented
2. Be tested
3. Be reviewed
4. Be committed to Git