# STRAND Project Guidelines & Reference Guide

## Critical Reference Files
For all coding operations, architecture schemas, prompt layouts, and build milestones:
1. **Architecture & Skeletons**: You MUST refer to [STRAND_AGENT.md](file:///home/mithil/hackathon/Strand/STRAND_AGENT.md) as the single source of truth for database schemas, Cypher queries, agent states, and configuration parameters.
2. **Build Plan & Timeline**: You MUST follow [plan.md](file:///home/mithil/hackathon/Strand/plan.md) for weekly milestones, Definition of Done criteria, branch naming rules, and integration test scripts.
3. **Figma UI/UX Mockups**: Refer to the [Figma Design](https://www.figma.com/design/bRWTvsFv3QeDJi8yLTk0uA/Strand?node-id=0-1&t=8FUIFPH4moS5VU8m-1) for spacing rules, component aesthetics, and layouts.

## Developer Memory Layer 
1. **READ**: At the start of a session or when asked about project context/history, you MUST call `traz_recent` to retrieve the latest state.
2. **WRITE**: After completing a major feature, fixing a bug, or receiving critical user context, you MUST call `traz_add` exactly ONCE. Keep the summary concise (1-3 sentences) to optimize tokens. Do not log conversational chitchat.

## Tech Stack & Development Standards
* **Backend**: FastAPI with Python 3.11+. Ensure database schemas align with `STRAND_AGENT.md §4`.
* **Frontend Dashboard**: Next.js 15 (App Router) with TailwindCSS v4. Prioritize rich dark-themed design aesthetics and responsive layouts.
* **Mobile App**: Native React Native (Expo) app configured for iOS and Android deployment. Audio observations are recorded using `expo-av` and transcribed via `@react-native-voice/voice` or backend Whisper API.
