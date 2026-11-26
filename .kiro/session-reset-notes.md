# Session reset investigation (2026-11-26)

Question: why does the Kiro IDE session keep resetting?

Log: `~/.kiro/logs/20261125T234934165-8198/kiro.log`

## Observed
- Four resets in about 85 minutes (23:56, 00:30, 01:01, 01:20 UTC). Each appears as `[KiroAgent] ACP session/new ... modeId=vibe idempotent=false`, 1-2 s after the last model call. The client created the new session.
- Last tool before each reset was a file edit (`str_replace` 00:30:27, `fs_write` 01:01:02, `fs_write` 01:20:47). The 23:56 reset was not checked.
- First reset: request payload 570,861 chars, 230 history messages.
- Streaming errors in the same period: `ChunkStreamedTool.call: This operation was aborted` (00:32, 00:57, 01:15, 01:19), `Failed to stream response chunks (inputSize=275013, historyMessages=106)` at 00:46, and one `execute_bash` call with `argBytes:0, outcome:error` at 01:00:02.
- Session leases are fresh. No crash or lease expiry in the log.

## Ruled out
- Shell commands: 194 of 195 `execute_bash` calls completed. The one error was the empty-argument call above. No reset directly followed a failed shell call.

## Unknown / next checks
- What triggers `session/new`: IDE action, a hook, or an automatic reset. Not determined.
- `.kiro/hooks` not yet inspected.
- Possible factor: very large history and payload.

## Unrelated noise
- `policy.ignore.evaluator_error ... path should be a path.relative()d string, but got "."` repeats. Harmless here.
