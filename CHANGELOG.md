# CHANGELOG

## v4.14.0 (2026-04-25) — Native UX upgrade

**Фича:** первый из трёх релизов «Native UX upgrade» — переход на нативные модули для плавного UX. В этом релизе только безопасные изменения без рефакторинга.

**Что сделано:**
- `expo-haptics` — тактильная отдача: long-press на сообщении (открытие меню реакций), свайп вправо для ответа, отправка сообщения. Импорт в `src/components/MessageBubble.tsx` и `src/screens/ChatScreen.tsx`.
- `react-native-keyboard-controller` — `<KeyboardProvider>` обёрнут вокруг приложения в `App.tsx`. Подготовка инфраструктуры для нативной обработки клавиатуры (Android-фиксы layout).
- `expo-blur` в `src/screens/ChatScreen.tsx` — пинбар (`pinBarWrap`), плашка ответа (`replyBar`) и плашка редактирования (`editBar`) переведены с полупрозрачного `backgroundColor` на нативный `<BlurView intensity={60} tint="dark">`. Реальное размытие фона вместо плоского цвета.
- `react-native-reanimated` для эмодзи-панели — `bottomPad` (общий padding для клавиатуры/эмодзи) переведён с `Animated.Value` (useNativeDriver: false, JS-поток) на `useSharedValue` + `useAnimatedStyle` (UI-поток через worklet). Убраны рывки при выезде эмодзи-панели на Android.
- Установлены, но **не задействованы** в этом релизе (в APK уже есть, ждут v4.15.0/v4.16.0): `@shopify/flash-list`, `@gorhom/bottom-sheet`, `react-native-mmkv`, `react-native-nitro-modules`, `react-native-pager-view`.

**EAS dev-build:** `02a61f66-5276-42e5-be99-e32c5280ab62` — содержит все 7 нативных модулей.

**Что НЕ в этой фиче (вынесено в бэклог):**
- `KeyboardStickyView` из `react-native-keyboard-controller` для нативного «прилипания» инпута к клавиатуре. Удалит ~30 строк ручного keyboard tracking в `ChatScreen.tsx`. Предложить при следующей пересборке APK.

## v4.13.0 (2026-04-24) — Фотогалерея

**Фича:** полноэкранный просмотр фото из чата — pinch-zoom, double-tap zoom, свайп между фото, swipe-down для закрытия. Вход — тап по фото в пузыре или в таб «Медиа» профиля.

**Что сделано:**
- Добавлены зависимости: `react-native-awesome-gallery`, `expo-image`, `react-native-reanimated` (Expo-совместимая версия). Работает в Expo Go — нативных модулей не требует.
- `src/screens/GalleryScreen.tsx` — новый компонент: `Modal` transparent, `AwesomeGallery` внутри, кастомный `renderItem` с `expo-image` (`recyclingKey` для кэша), хедер с счётчиком «N из M» и крестиком (toggle по тапу), `onSwipeToClose`, `doubleTapScale=2.5`, `maxScale=5`, `numToRender=3`.
- `src/components/MessageBubble.tsx` — новый prop `onImagePress`, фото-пузырь обёрнут в `TouchableOpacity` с этим коллбэком.
- `src/screens/ChatScreen.tsx` — новый prop `onOpenGallery`, коллбэк `handleImagePress` собирает `msg.image` из всех сообщений чата и открывает галерею на текущем индексе.
- `src/screens/UserProfileScreen.tsx` — новый prop `onOpenGallery`, тап по тайлу в табе «Медиа» открывает галерею на соответствующем индексе (вместо заглушки `Alert`).
- `App.tsx` — state `gallery: { images, index } | null`, overlay `<GalleryScreen>` поверх всех экранов, коллбэки проброшены в `ChatScreen` и `UserProfileScreen`.

**Что НЕ в этой фиче (вынесено в бэклог):**
- save/share/info фото (кнопки сохранения/шаринга/инфо).
- Видео в галерее (сейчас только фото).
- Декодирование base64 data-URL → `file://` через `expo-file-system` для крупных альбомов (промежуточный шаг до миграции на Firebase Storage, BL-1).

## v4.12.0 (2026-04-24) — Оптимизация рендеринга списков

**Оптимизация:** уменьшение ре-рендеров FlatList за счёт мемоизации `renderItem` и `keyExtractor`, тюнинг параметров виртуализации в списке чатов.

**Что сделано:**
- `src/screens/ChatListScreen.tsx` — `renderChatItem` и `keyExtractor` вынесены в `useCallback` (раньше пересоздавались на каждом ре-рендере, провоцируя диффы всего списка). На `FlatList` добавлены `initialNumToRender={12}`, `maxToRenderPerBatch={8}`, `windowSize={7}`.
- `src/screens/ChatScreen.tsx` — `keyExtractor` вынесен в `useCallback`.

**Почему НЕ взято из ветки пользователя:**
- Удаление `reversedMessages` — сломало бы порядок сообщений в `inverted` FlatList (новые должны быть data[0]).
- Переворот направления итерации в `showSenderMap` — меняет семантику группировки (имя отправителя перемещается с верхнего сообщения блока на нижнее).
- `removeClippedSubviews={true}` — известные Android-баги с пропадающими пузырями при скролле.
- `scrollEventThrottle: 100 → 16` — это регрессия, в 6 раз больше JS-коллбэков на каждый кадр скролла.
- `.gitignore` generic-шаблон — начинался с литерала ` ``` `, удалял Expo/RN-паттерны (`.expo/`, `*.apk`, `*.aab`, `ios/build/`, `android/build/`), добавлял Python-мусор (`__pycache__`, `venv/`).

## v4.11.0 (2026-04-24) — Полировка контекстного меню (копирование + пересылка)

**Фича:** toast «Скопировано» после копирования сообщения и Telegram-style пересылка (аватары, переход в целевой чат).

**Что сделано:**
- `src/components/Toast.tsx` — новый компонент: absolute bottom, fade+slide, авто-скрытие через 2 сек (native driver).
- `src/screens/ChatScreen.tsx` — `handleCopy` триггерит toast «Скопировано». Новый prop `onNavigateToChat`. `handleForwardPick` принимает полный `ForwardTarget` и после отправки переключается в целевой чат (если не текущий).
- `src/components/ForwardModal.tsx` — TG-like список получателей: реальные аватары через `AvatarView` для приватных, эмодзи-кружки для общего/группового, превью последнего сообщения, сортировка по `lastTs`. Новый экспортируемый тип `ForwardTarget = { id, name, isGroup }`.
- `App.tsx` — `handleOpenChat` прокинут в ChatScreen как `onNavigateToChat`.

## v4.10.0 (2026-04-24) — Видеозвонки

**Фича:** полноценные видеозвонки поверх существующего WebRTC-аудиозвонка. Исходящий с превью своей камеры, активный с fullscreen + PIP и drag/swap, вход в видеозвонок из шапки чата и меню.

**Что сделано:**
- `src/services/CallManager.ts` — расширен снапшот (`video`, `cameraOn`, `remoteVideoOn`, `cameraFacing`, `swapped`, `localStreamURL`, `remoteStreamURL`). `getMediaStream(withVideo, facing)` с видео-констрейнтами. Новые методы `toggleCamera`, `flipCamera` (через `track._switchCamera()`), `swapVideos`. `startCall` принимает флаг `withVideo`, пишет его в RTDB `/calls/{cid}/video`. `handleIncoming` читает тип вызова. `writeChatHistory` помечает `callVideo: true` и пишет «видеовызов» в превью.
- `src/screens/CallScreen.tsx` — полный ре-дизайн под видео:
  - RTCView fullscreen (удалённое видео или локальное при swap) + PIP 120×160.
  - PIP draggable через `PanResponder`, тап по PIP = swap ролей.
  - Три режима: outgoing video (fullscreen своя камера + top overlay), active video (RTCView + PIP + top-bar с именем/таймером), audio/incoming (градиент + кольца + аватар).
  - Fallback-оверлей с аватаром когда пир выключил камеру.
  - Панель кнопок закреплена абсолютно внизу во всех режимах (в active video добавились `flip` и `toggleCamera`).
- `src/screens/ChatScreen.tsx` — в шапке приватного чата добавлена кнопка 📞 (→ аудиозвонок). Кнопка ⋮ теперь открывает popup-меню (вместо прямого theme-picker).
- `src/components/ChatMenu.tsx` — новый компонент popup-меню верх-справа (как в вебе): «Видеозвонок» (→ `startCall(peer, true)`), «Изменить обои» (→ theme picker). Видео-пункт скрыт для групп.
- `src/screens/UserProfileScreen.tsx` — кнопка «Видео» вызывает `startCall(username, true)`.
- `src/components/CallBubble.tsx` + `src/managers/ChatManager.ts` — в истории вызовов текст «Пропущенный видеовызов» / «Входящий видеовызов» + иконка камеры. Redial с тем же типом.
- `src/components/Icons.tsx` — добавлены `IconBell`, `IconBellOff`, `IconWallpaper`.

## v4.9.1 (2026-04-24) — Плавные анимации клавиатуры и панели эмодзи

**Баги:**
1. Панель эмодзи выезжала с лёгкими рывками — `Animated.timing` на `height` c `useNativeDriver: false` триггерит layout-пересчёт всего дерева (включая тяжёлый FlatList эмодзи) на каждый кадр.
2. При тапе в поле ввода чат сдвигался вверх толчком — `KeyboardAvoidingView behavior="height"` на Android синхронно снаппит высоту после `keyboardDidShow`, без анимации.

**Фикс (`src/screens/ChatScreen.tsx`):**
- Убран `KeyboardAvoidingView`. Заменён на единый `Animated.Value bottomPad`, анимируемый 240мс с `Easing.out(Easing.cubic)` по `keyboardDidShow/Hide`.
- Панель эмодзи перенесена в абсолютно позиционированный контейнер на дне экрана. Анимация — `translateY` (300 → 0) c `useNativeDriver: true` (GPU-driven, не блокирует JS-поток).
- Параллельно анимируется `bottomPad` — чтобы поле ввода плавно поднималось над эмодзи-панелью.
- Координация: если клавиатура открывается поверх открытой эмодзи-панели (тап в инпут), эмодзи плавно съезжает вниз до высоты клавиатуры.

## v4.9.0 (2026-04-24) — Редактирование своего профиля

**Фича:** раздел профиля пользователя в RTDB (`/profiles/<username>`), аватары, редактирование имени/статуса/телефона/дня рождения, подстановка аватара во все места где раньше был цветной кружок с буквой.

**Что сделано:**
- `src/services/profiles.ts` — CRUD для `/profiles/<user>` (`getProfile`, `setProfile`, `listenProfile`, `setAvatar` через base64 data-URL). Совместимо с веб-версией.
- `src/components/AvatarView.tsx` — переиспользуемый аватар с подпиской на `listenProfile`: если есть `avatar` — `<Image>`, иначе цветной кружок с буквой (как раньше).
- `src/components/AvatarPicker.tsx` — bottom sheet с тремя опциями: «Сделать селфи» (`launchCameraAsync`, фронтальная камера), «Выбрать из галереи» (`launchImageLibraryAsync`), «Удалить». Внутри `allowsEditing: true`, квадрат `[1,1]`, `base64: true`.
- `src/screens/ProfileEditScreen.tsx` — slide-in справа, как `UserProfileScreen`. Поля: `displayName`, `status`, `phone`, `birthday` + readonly `@username`. Тап по аватару → `AvatarPicker`. Оптимистичное обновление аватара (`setAvatarLocal` до `await setAvatar`, чтобы UI не ждал записи).
- `src/screens/DrawerContent.tsx` — шапка drawer-а теперь тапабельна (открывает `ProfileEditScreen`), добавлен пункт меню «Мой профиль», онлайн-юзеры отрисованы через `AvatarView`.
- `App.tsx` — новый оверлей `profileEditOpen`.
- Замена аватаров на `AvatarView` в приватных чатах: `ChatScreen` (хедер), `ChatListScreen` (превью чатов), `UserProfileScreen` (аватар профиля).
- `app.json` — добавлены Android permissions `CAMERA` и `READ_MEDIA_IMAGES`.
- Версия: `4.9.0` в `package.json` и `app.json`.

**Известные ограничения:**
- Селфи с фронтальной камеры сохраняется зеркальным (баг в бэклоге). Фикс — через `expo-image-manipulator` + `flip: Horizontal`, потребует пересборки APK.

## v4.8.1 (2026-04-24) — Фикс перекрытия поля ввода клавиатурой

**Баг:** при тапе в поле ввода Android-клавиатура (включая языковую/suggestion-панель) перекрывала инпут — поле не сдвигалось вверх.

**Причина:** с `edgeToEdgeEnabled: true` (Android 15 edge-to-edge) `windowSoftInputMode="adjustResize"` в манифесте не триггерит нативный ресайз окна — приложение само владеет insets. `KeyboardAvoidingView behavior={undefined}` на Android полагался на нативный ресайз — и ничего не делал.

**Фикс:** `src/screens/ChatScreen.tsx` — `behavior` для Android сменён с `undefined` на `'height'`. Теперь RN компенсирует высоту клавиатуры на уровне JS.

## v4.8.0 (2026-04-24) — Аудиозвонки (WebRTC)

**Фича:** полноценные аудиозвонки через WebRTC + Firebase signaling. Порт `CallManager.js` из веб-версии.

**Что сделано:**
- `src/services/CallManager.ts` — WebRTC peer connection, signaling через `/calls/{callId}` в Firebase RTDB, ICE через metered.ca (STUN+TURN), глобальный слушатель входящих для залогиненного пользователя.
- `src/services/ringtones.ts` — управление рингтонами через `expo-audio` (`createAudioPlayer`), поддержка пер-юзерных рингтонов через `/userRingtones/{me}/{other}`, 5 вариантов звонка + ringback.
- `assets/ringtones/` — 6 mp3 с Mixkit (ring1-5 + ringback).
- `src/screens/CallScreen.tsx` — полноэкранный оверлей поверх всего приложения (3 состояния: outgoing/incoming/active), градиентный фон, аватар 170px с двумя пульсирующими кольцами (Animated.loop), таймер разговора, кнопки управления (mute/speaker/end/accept).
- `src/components/CallBubble.tsx` — системный пузырь звонка в чате (входящий/исходящий/пропущенный/отклонённый/busy, redial по тапу).
- `src/managers/ChatManager.ts` — `Message.callDir/callDur/missed` для истории звонков.
- `src/screens/UserProfileScreen.tsx` — кнопка «Звонок» теперь реально вызывает `startCall(username)`.
- `App.tsx` — `initCallManager(user)` + `<CallScreen />` оверлей при логине.
- Android permissions: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `WAKE_LOCK`, `BLUETOOTH_CONNECT`.
- `eas.json` — `appVersionSource: local` (читаем версию из app.json, а не из remote store).
- Версионирование: `src/version.ts` (`APP_VERSION_FULL` = `v{version} (build {versionCode})`), версия в бургер-меню.

**Исправленные баги:**
- Само-busy в `startGlobalListener`: слушатель срабатывал повторно (при ICE/answer/status апдейтах), видел `state !== 'idle'` и ставил busy на собственный входящий. Фикс: игнорируем `callId === child.key`.
- Self-call: проверка `d.from !== me` в слушателе + `target !== me` в `startCall`.
- SecurityException: добавлен `WAKE_LOCK` — требуется `InCallManager.start()`.

**Известные ограничения:**
- Видеозвонки — v4.9.0.
- Пуш-уведомления о входящем звонке при закрытом приложении — отложено (Фаза 5).
- Два эмулятора одновременно — ненадёжный звук (один источник host audio); проверять между эмулятором и физическим устройством.

## v4.7.0 (2026-04-20) — Профиль собеседника

**Фича:** тап на хедер чата (имя/аватар/статус) в приватном чате → плавно выезжает слева панель профиля. Портировано из веба (`showUserProfile` в `ui.js`).

**Что сделано:**
- Новый экран `src/screens/UserProfileScreen.tsx`:
  - Slide-in анимация слева направо (translateX от `-SCREEN_W` до 0, easing `bezier(.25,.1,.25,1)`, 320мс) + opacity fade-in
  - Свайп вправо для закрытия (PanGestureHandler, порог 30% ширины или velocityX > 800)
  - Большой круглый аватар 120×120 (буква на цветном фоне)
  - Имя 22px + статус (онлайн / был(а) X) — берётся из существующего `presence.ts`
  - 3 кнопки действий: **Чат** (закрывает профиль), **Звонок** / **Видео** (заглушка `Alert: «В разработке»` — отложено до Фазы 4)
  - Строка `@username` с подписью «Имя пользователя»
  - 5 табов: **Медиа** (сетка 3 колонки) / **Файлы** (заглушка) / **Ссылки** (тап → `Linking.openURL`) / **Музыка** (список голосовых без плеера) / **Обои** (заглушка)
  - Источник медиа — `listenMessages(chatId)`, фильтрация по `image`/`audio`/regex для ссылок
- Новые иконки в `Icons.tsx`: `IconChat` (пузырь сообщения), `IconVideoCamera` (классическая видеокамера)
- `ChatScreen.tsx`: проп `onOpenProfile?: (otherUser: string) => void`, хедер кликабелен только в приватных чатах (не group, не general)
- `App.tsx`: новое состояние `profileUser`, `UserProfileScreen` рендерится поверх `ChatScreen` как overlay (z-index 30)

**Известные ограничения (вынесено в бэклог):**
- Кнопки Звонок/Видео — заглушка до Фазы 4
- Тап по медиа — заглушка, fullscreen-галерея с pinch-zoom отдельной задачей
- Sticky-табы при скролле — отключены (в Telegram табы прилипают к верху, у нас пока скроллятся вместе с контентом)

## v4.6.0 (2026-04-19) — Контекстное меню: реакции, редактирование, удаление

**Фичи:**
- Реакции переехали внутрь пузыря (под текстом), вместо отдельного блока под пузырём.
- Редактирование сообщения через контекстное меню: текст подгружается в основной инпут, над ним появляется полоска «Редактирование» (иконка + текст + кнопка ×), микрофон заменяется на флажок ✓.
- Удалён лишний компонент `EditPanel` — всё редактирование в одном инпуте.

**Что сделано:**
- `MessageBubble.tsx`: реакции перенесены в `metaRow` внутри пузыря; если реакций нет — время по-прежнему абсолютно позиционировано; убран `reactionsRow` под пузырём.
- `ChatScreen.tsx`: добавлены `editBar` (полоска редактирования), `handleEditSubmit`, `handleEditCancel`, `prevTextRef`; правая кнопка: `editMsg → флажок`, `recording → отправить аудио`, `hasText → отправить`, иначе → микрофон.
- `Icons.tsx`: добавлена `IconCheck` (флажок ✓).
- `EditPanel.tsx`: удалён.

## v4.5.0 (2026-04-19) — Счётчик непрочитанных

**Фича:** круглый бейдж с числом непрочитанных сообщений справа от превью в списке чатов. Портировано из веба (`rCL` в `chat.js`).

**Что сделано:**
- Новый сервис `src/services/unread.ts` — `listenUnread(chatId, user, cb)`:
  - Слушает `/readReceipts/<chatId>/<user>` (мой ts прочтения).
  - Слушает последние 50 сообщений `/messages/<chatId>` через `query + limitToLast(50)` — чтобы не тянуть всю историю.
  - Считает: количество сообщений, где `sender !== user && ts > myReadTs`.
  - Флаг `capped = true` если упёрлись в лимит 50 → рендер `50+`.
- `ChatListScreen.tsx`: подписка на unread для каждого чата (unmount = отписка); добавлен `chatBottom` row с превью слева и бейджем справа. Бейдж `minWidth 22px`, круглый, `theme.accent`, текст белый полужирный.
- Счётчик автоматически обнуляется при открытии чата за счёт `markRead` из v4.4.0.

**Не проверено пользователем** — отложено в бэклог на последующую приёмку.

## v4.4.0 (2026-04-19) — Read receipts

**Фича:** галочки статуса отправленных сообщений — ✓ (отправлено) / ✓✓ (прочитано), как в Telegram/WhatsApp. Портировано из веба.

**Что сделано:**
- Новый сервис `src/services/readReceipts.ts`:
  - `markRead(chatId, user)` — пишет `serverTimestamp()` в `/readReceipts/<chatId>/<user>`.
  - `listenReadReceipts(chatId, meUser, cb)` — возвращает max timestamp среди всех участников, кроме себя.
- `ChatScreen.tsx`: подписка на readReceipts; `markRead` вызывается при открытии чата и при каждом новом сообщении (чтобы входящие тоже помечались прочитанными на лету). Для каждого своего сообщения вычисляем `isRead = msg.ts <= maxOtherReadTs` и передаём в `MessageBubble`.
- `MessageBubble.tsx`: новый проп `isRead`, компонент `<CheckMark>` — ✓ серый для отправленных, ✓✓ зелёный (`#55EFC4`) для прочитанных. Работает в текстовых, фото, аудио и видео-пузырях. Добавлено в memo-comparator.

**Логика как в вебе:** если хоть один другой участник чата имеет `readTs ≥ msg.ts` → сообщение считается прочитанным. Для приватного чата это единственный собеседник, для группы — любой из участников.

**Не проверено пользователем** (требует 2 устройства/аккаунта) — отложено в бэклог на последующую приёмку.

## v4.3.0 (2026-04-19) — Typing indicator

**Фича:** показываем «печатает...» в хедере чата и в превью списка чатов. Портировано из веба.

**Что сделано:**
- Новый сервис `src/services/typing.ts`:
  - `setTyping(chatId, user)` — пишет `serverTimestamp()` в `/typing/<chatId>/<user>`. Дебаунс 2 сек (не чаще раза в 2с), авто-стоп через 4 сек после последнего вызова, `onDisconnect().remove()`.
  - `stopTyping(chatId, user)` — удаляет запись.
  - `listenTyping(chatId, meUser, cb)` — threshold 5 сек; фильтрует себя; реэмит каждые 2 сек (чтобы старые записи сами «потухли»).
  - `formatTypingText` — для групп: «Alex, Bob печатают», 3+ → «… и др. печатают».
- Новый компонент `src/components/TypingDots.tsx` — 3 точки с opacity 0.3→1, стаггер 0/200/400мс (Animated.loop).
- `ChatScreen.tsx`: `onChangeText` вызывает `setTyping`, отправка/unmount — `stopTyping`. В хедере при активном typing — «печатает» + точки зелёным поверх «онлайн»/lastSeen.
- `ChatListScreen.tsx`: подписка на typing для каждого чата; в превью вместо lastText — зелёный курсив «печатает...».

**Не проверено пользователем** (требует 2 устройства/аккаунта) — отложено в бэклог.

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
