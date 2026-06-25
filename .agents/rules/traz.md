CRITICAL CONTEXT SYNC:
1. READ: At the start of a session or when asked about project context/history, you MUST call `traz_recent` to retrieve the latest state.
2. WRITE: After completing a major feature, fixing a bug, or receiving critical user context, you MUST call `traz_add` exactly ONCE. Keep the summary concise (1-3 sentences) to optimize tokens. Do not log conversational chitchat.
