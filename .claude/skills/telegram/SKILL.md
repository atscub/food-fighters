---
name: telegram
description: Send a message to the human via Telegram. Use whenever you need to notify, ask for feedback, or communicate with the user.
user-invocable: true
allowed-tools: Bash
argument-hint: [message]
---

Send a Telegram message to the human with the following content:

$ARGUMENTS

Use this exact curl command:
```bash
curl -s -X POST "https://api.telegram.org/bot7922194448:AAGfZAdi0d2KqfnLZo_2-oRYVvpSCaKLdTs/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 458211758, "text": "'"$ARGUMENTS"'", "parse_mode": "Markdown"}'
```

After sending, confirm to the caller that the message was sent successfully.
