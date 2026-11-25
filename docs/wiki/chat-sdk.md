# Vercel Chat SDK

Topic: one codebase for chat bots across messaging platforms.
Sources: https://vercel.com/docs/chat-sdk/quickstart ; https://vercel.com/changelog/chat-sdk ; https://github.com/vercel/chat
Retrieved: 2026-11-19

## What it is
A TypeScript library (`chat`) for bots on Slack, Microsoft Teams, Google Chat, Discord, Telegram, GitHub, Linear and others. You register handlers such as new-mention and subscribed-message; adapters handle webhooks and platform APIs; a state adapter (for example Redis) shares subscriptions and locks.

## Quickstart
`create-chat-sdk` scaffolds a Next.js bot with Slack and Redis adapters and Vercel Connect for credentials.

## Related integrations
AI Gateway streaming into threads, Vercel Sandbox, Workflows (pause for human approval). `@json-render/chat` renders json-render specs as native cards.

## For Subsidiary
- It is for reaching users inside Slack/Teams/etc. It is not an in-app canvas, so it does not belong in the GUI.
- It would be an extension later (Subsidiary reachable from Slack). It needs network and hosted credentials, which conflicts with the no-network container demo.
- Not in scope for the hackathon.
