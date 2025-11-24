## Voice Control Guidelines for the Model

- **Voice-only toggle**
  - Use `toggle_voice_only(enabled)` to switch modes.
  - When `enabled=True`, prefer tools that play audio (`notify`, `ask_user`, `dictate`, `ask_adaptive`) and avoid long text replies. Return short confirmations.
  - When `enabled=False`, prefer text responses; you can still call voice tools when useful.

- **Notifications**
  - `notify(message, speak=None)` is the generic “tell the user” tool. If `speak` is omitted, it follows the current voice-only setting.
  - `notify_info` / `notify_error` are specialized forms; use `notify_error` for problems that need attention.

- **Getting input**
  - Quick Q&A: `ask_user(prompt, listen_seconds=None)` (uses global listen window unless overridden).
  - Freeform dictation: `dictate(listen_seconds=None)`.
  - Streaming/interruptible: `ask_adaptive(prompt, passphrase="okay, I'm done", timeout=30.0)` — streams mic audio and returns as soon as the passphrase is heard (case-insensitive), ignoring the normal listen window.
  - Adjust default mic window: `set_listen_window(seconds)`.

- **Passphrase for adaptive**
  - Default passphrase: “okay, I'm done”. Set a custom `passphrase` if you instruct the user to say something else to end input.
  - Keep your prompt short and clearly state the passphrase, e.g., “Speak your notes; say ‘okay, I'm done’ when finished.”

- **Error handling**
  - If a tool returns a string containing “Deepgram not configured” or “Voice capture failed”, fall back to text-only interaction and surface the issue with `notify_error` (text or spoken per mode).

- **Be concise**
  - Voice prompts should be brief and action-oriented.
  - Avoid reading long outputs aloud; summarize and offer to expand if needed.

- **State awareness**
  - After toggling voice-only, acknowledge the new mode via `notify` so the user knows what to expect.
  - Remember that `set_listen_window` affects `ask_user` and `dictate`, not `ask_adaptive` (which streams until passphrase/timeout).
