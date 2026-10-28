# agent-trace

**Claim:** every answer is auditable — each chat turn is an agent run whose plan, tool calls, policy decisions and LLM calls are recorded, and the SDK gives you all of it from one call.

This is the "show me what the agent did" screen every product embedding Loom ends up wanting. It uses only the standard client (no `/admin`).

## What you need

- Node 20
- A Loom tenant and an API key that can read and create chat sessions.

## Setup

```sh
cp .env.example .env
```

| Variable | What it is |
| --- | --- |
| `LOOM_API_URL` | Your tenant. Read by the dev proxy only. |
| `LOOM_API_KEY` | API key. Never `VITE_`-prefixed. |

## Run

```sh
npm i
npm run dev
```

## Walkthrough

1. The left rail lists the key's chat sessions, active or archived. Hover a row to **pin** or **archive** it.
2. Pick a session. The transcript shows each turn; under every assistant message is the run behind it (`completed · 2 iter · 1 tool`).
3. Click **show trace**. The right panel is the recorded run: a summary (iterations, tool calls, LLM calls, tokens, wall time), the event timeline with offsets from `run_started`, each tool call with its arguments, result and the **policy decision** that allowed it, any approvals, and the LLM calls with model, tokens and latency.
4. Ask a follow-up in the composer. The turn streams over SSE with `includeTrace: true`, so the same events appear live on the left as they happen — plan, model calls, tool proposed → policy evaluated → started → completed, reasoning, answer. When it finishes, its recorded trace opens on the right.
5. Click **fork from here** on any assistant message: Loom creates a new session that copies the conversation up to that point. It appears in the rail with a `fork` badge.
6. Click **New**, ask a question with no session selected, and watch a session get created from the first prompt (the title is generated server-side).
7. Open **Admin** in the top bar and find the same run under chat runs — the example is a thin view over the same data.

## Files that matter

- [src/components/SessionRail.tsx](src/components/SessionRail.tsx) — `useChatSessions`, `useUpdateChatSession` (pin, archive).
- [src/components/Transcript.tsx](src/components/Transcript.tsx) — `useChatMessages`, `useChatRuns`, `useForkChatSession`; links each assistant turn to its run.
- [src/components/Timeline.tsx](src/components/Timeline.tsx) — `useChatRun` → `LoomChatRunReplay`: events, tool calls, policy decisions, approvals, LLM calls.
- [src/components/Ask.tsx](src/components/Ask.tsx) — `useSendChatMessage` / `useCreateChatSession` with `includeTrace` and stream handlers.
- [vite.config.ts](vite.config.ts) — the `/loom` proxy that injects the key.

## SDK surface

Concepts (sessions, runs, traces, how they relate) are in [docs/loom-sdk-outline.md](../docs/loom-sdk-outline.md).

| Need | Call |
| --- | --- |
| Sessions | `useChatSessions({ status, limit })`; `useUpdateChatSession(id).mutate({ isPinned, isArchived })` |
| Transcript | `useChatMessages(sessionId)` → `messages[]`, `toolExecutions[]` |
| Runs of a session | `useChatRuns(sessionId)` → `LoomChatAgentRun[]` (`userMessageId`, `assistantMessageId`, `status`, `iterations`, `toolCallCount`) |
| Full trace of a run | `useChatRun(sessionId, runId)` → `LoomChatRunReplay` (`events`, `toolCalls`, `policyDecisions`, `approvals`, `llmCalls`, `traceCompleteness`) |
| Live trace while streaming | `useSendChatMessage().mutate({ sessionId, content, includeTrace: true, handlers: { onTrace, onToolExecution, onReasoningDelta, onDelta, onDone } })` |
| New session | `useCreateChatSession().mutate({ prompt, includeTrace, handlers: { onSession, … } })` |
| Fork | `useForkChatSession().mutate({ sessionId, messageId })` |

## Known limitations

- Dev-server only; see the root README for the auth pattern.
- The run row is finalised about a second after the stream's last event, so the transcript re-fetches once more shortly after `onDone`.
- Forked sessions copy messages but not runs, so their copied turns show "no run recorded" until you ask something new.
- `@tetralabs/loom-react` 0.1.0 publishes typings that reference a path the core package does not ship. `scripts/fix-sdk-types.mjs` runs after install and shims it.
- The logo in the top bar is a placeholder mark.

## Tested against

- `@tetralabs/loom`, `@tetralabs/loom-react` 0.1.0
- React 19.3.1, Vite 7.3.7, TypeScript 5.9.3
- A Loom dev tenant, 2026-10-28 (SSE streaming through the Vite proxy confirmed)
