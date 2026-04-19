# v4.6.0 — Context Menu + Edit + Delete — Verification Checklist

## Before Testing
- [ ] Reactions positioning fixed (time and reactions on same level)
- [ ] Edit button properly wired in ReactionPicker
- [ ] IconCtxEdit is imported and available
- [ ] EditPanel component fully functional

## Visual Tests
- [ ] Context menu appears on long-press ✓✓ (not overflow)
- [ ] Menu buttons have correct icons (Reply, Copy, Forward, Pin, Edit, Delete, Private)
- [ ] Edit icon matches menu icon used elsewhere
- [ ] Reactions display inline with message time (not below time)
- [ ] Reaction badges show emoji + count (e.g., "👍 2")
- [ ] Delete button is red color (#e74c3c)
- [ ] Edit/Delete only visible when isMe=true
- [ ] Private only visible in general chat for other users

## Functionality Tests
- [ ] Long-press on message opens menu
- [ ] Tap emoji closes menu and adds reaction
- [ ] Tap "+" opens all emoji picker
- [ ] Tap outside menu closes it
- [ ] Tap "Ответить" sets reply (checks replyTo and replyBar appears)
- [ ] Tap "Копировать" copies text to clipboard (check Clipboard)
- [ ] Tap "Переслать" opens ForwardModal with chat list
- [ ] Tap "Закрепить" pins message (pin icon appears in pin bar)
- [ ] Tap "Открепить" removes pin
- [ ] **Tap "Редактировать" opens EditPanel with initial text** ← CRITICAL
- [ ] EditPanel has textarea with message text
- [ ] Can type new text in EditPanel
- [ ] Tap "Готово" confirms edit (message text updates in chat)
- [ ] Tap "Отмена" closes EditPanel without saving
- [ ] Edited message shows "изм. " prefix before time
- [ ] Tap "Удалить" removes message from chat
- [ ] Tap "Написать лично" opens private 1-on-1 chat

## Edge Cases
- [ ] Edit own text message ✓
- [ ] Edit audio message ✓
- [ ] Edit video message ✓
- [ ] Edit image message ✓
- [ ] Cannot edit message with empty text
- [ ] Cannot edit other user's messages
- [ ] Multiple reactions on same message
- [ ] Remove reaction by tapping emoji badge
- [ ] Forward to different chat (verify in target chat)

## Icon Consistency
- [ ] IconCtxEdit used in ReactionPicker menu
- [ ] IconCtxEdit used anywhere else? (check codebase)
- [ ] All 7 context icons match web-source visually

## Firebase Operations
- [ ] Edit persists to `/messages/<chatId>/<key>/text` and `/messages/<chatId>/<key>/edited`
- [ ] Delete removes message from `/messages/<chatId>/<key>`
- [ ] Forward creates new message with `forwarded: "OriginalSender"`
- [ ] Reaction updates `/messages/<chatId>/<key>/reactions/<user>`

## Known Limitations
- [ ] Blur effect disabled (Expo Go limitation) — noted in backlog for EAS Build
- [ ] Edit button may not work if selectedMsg is stale (check memo comparator)
