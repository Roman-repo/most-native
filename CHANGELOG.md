# CHANGELOG

## v4.2.0 (2026-04-19) — Online-статус и last seen

**Фича:** показываем, в сети ли собеседник, либо когда он был последний раз. Портировано из веб-версии.

**Что сделано:**
- Новый сервис `src/services/presence.ts`:
  - `startPresence(user)` — пишет в `/online/<user>` heartbeat раз в 15 сек, `onDisconnect().remove()`, слушает AppState (свернули → offline, вернули → online).
  - `listenUserPresence(user, cb)` — online = `(now - ts) < 45 сек`, lastSeen из `/lastSeen/<user>`.
  - `formatLastSeen(ts)` — «только что» / «N мин назад» / «сегодня в HH:MM» / «вчера в HH:MM» / «DD месяц в HH:MM».
- `App.tsx`: запуск presence по `useEffect([user])`, cleanup при логауте.
- `ChatListScreen.tsx`: зелёная точка 13×13 в правом нижнем углу аватара приватных чатов.
- `ChatScreen.tsx`: в хедере вместо «личный чат» — «онлайн» (зелёный) или «был(а) X». Для группового/общего чата текст прежний.

**Не проверено пользователем** (требует 2 устройства/аккаунта) — отложено в бэклог на последующую приёмку.

## v4.1.1 (2026-04-19) — Фикс размера видеокружка

**Баг:** отправка видеокружка падала с ошибкой `value argument contains a string greater than 10485760 utf8 bytes` — Firebase RTDB запрещает значения property больше 10 МБ, а base64-видео их превышало.

**Что сделано:**
- `VideoRecorder`: максимальная длительность 30 → 15 сек; в `recordAsync` добавлены `maxFileSize: 7 MB` и `videoBitrate: 800 kbps` (native-энкодер сам ограничивает размер).
- `ChatScreen.handleSendVideo`: перед base64-конвертацией проверяем размер файла через `FileSystem.getInfoAsync`. Если больше ~6.75 МБ (binary, → ~9 МБ в base64) — показываем Alert с размером файла, отмена отправки. Страховка на случай, если native `maxFileSize` отработает нестрого.

**Корневая причина (архитектурная):** медиа хранится в RTDB как base64 из-за Spark-плана Firebase (BL-1). Длительное решение — миграция на Firebase Storage (Blaze-план), добавлено в бэклог.

## v4.1.0 (2026-04-19) — Плавный чат

**Фича:** Текстовый пузырь и скролл чата приведены к визуалу веб-версии, без рывков при появлении новых сообщений.

**Что сделано:**
- Время в пузыре теперь inline справа (как в веб `.mt` с `float:right`), текст обтекает через невидимый NBSP-spacer + absolute-позиционированный блок времени.
- Анимация появления нового сообщения `msg-arrive`: opacity 0.5→1, translateY 12→0, scale 0.97→1 за 350ms (портирована из веб keyframes).
- Плавный скролл при новом сообщении: `onContentSizeChange` + `maintainVisibleContentPosition` вместо `useEffect(messages.length)` с `setTimeout`. RN-аналог веб-паттерна «scroll после DOM-апдейта».
- Видео переведено с deprecated `expo-av` на `expo-video` (`VideoView`, `useVideoPlayer`), убран бесконечный `loop`, добавлена кнопка паузы двумя `View`-прямоугольниками.
- Performance: кастомный `memo` comparator для `MessageBubble` — Firebase `onValue` создаёт новые object refs на каждый апдейт, дефолтный shallow-compare бесполезен.

**Фиксы по ходу:**
- Убран артефакт-полоска над emoji-панелью (`overflow:'hidden'` на collapsible-обёртке).
- Исправлен большой отступ под инпутом на Android после dismiss клавиатуры (`KeyboardAvoidingView behavior={undefined}` + фиксированный `paddingBottom:6`, без `insets.bottom`).

**Ключевые уроки** (в `feedback_debugging.md`):
- При портировании web→RN сверять не только *что* делает веб, но и *когда* (фаза жизненного цикла).
- `height:0` без `overflow:'hidden'` не скрывает детей.
- На Android не складывать `KeyboardAvoidingView` с `insets.bottom`.
