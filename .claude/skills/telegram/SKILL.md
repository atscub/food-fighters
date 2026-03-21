---
name: telegram
description: Send a message to the human via Telegram and optionally wait for a reply. Use whenever you need to notify, ask for feedback, or communicate with the user.
user-invocable: true
allowed-tools: Bash
argument-hint: [message]
---

Send a Telegram message to the human with the following content:

$ARGUMENTS

## Sending
Use this curl command to send:
```bash
curl -s -X POST "https://api.telegram.org/bot7922194448:AAGfZAdi0d2KqfnLZo_2-oRYVvpSCaKLdTs/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 458211758, "text": "<message>", "parse_mode": "Markdown"}'
```

## Waiting for reply
When the message asks for feedback or requires a response, poll for the reply:
```bash
curl -s "https://api.telegram.org/bot7922194448:AAGfZAdi0d2KqfnLZo_2-oRYVvpSCaKLdTs/getUpdates" | python3 -m json.tool
```

- Poll every 15 seconds until a reply appears from chat_id 458211758.
- Once received, acknowledge the update by calling getUpdates with `?offset=<last_update_id + 1>`.
- Return the reply text to the caller.
