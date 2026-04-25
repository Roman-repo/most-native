# Передача сессии — v4.14.0 → v4.16.0 «Native UX upgrade»

## Контекст

Контекст предыдущей сессии переполнился. Это передача в новую сессию.

Проект: **Мост Native** (`/Users/rl/most/most-native`) — миграция веб-мессенджера на React Native + Expo. Полный контекст в `/Users/rl/most/CLAUDE.md`. Память пользователя — в `~/.claude/projects/-Users-rl/memory/MEMORY.md`.

Текущая фаза: после v4.13.0 (фотогалерея) пользователь одобрил серию релизов «Native UX upgrade» — миграция на нативные модули для плавного UX.

---

## Где мы остановились

### Git
- Текущая ветка: `feat/4.14.0-native-ux-upgrade`
- Последний merge в main: `fcbc563` (v4.13.0 фотогалерея)
- В main: версия 4.13.0, .npmrc с `legacy-peer-deps=true`

### Незакоммиченные изменения
```
modified:   package.json          ← добавлены 7 нативных модулей
modified:   package-lock.json
modified:   src/components/MessageBubble.tsx   ← haptics на long-press + swipe-reply
modified:   src/screens/ChatScreen.tsx          ← haptics на send
```

### EAS dev-build
Запущен билд `02a61f66-5276-42e5-be99-e32c5280ab62` (https://expo.dev/accounts/romanlg/projects/most-native/builds/02a61f66-5276-42e5-be99-e32c5280ab62) — содержит ВСЕ 7 нативных модулей, можно тестировать постепенно. **Проверить статус билда первым делом.**

### Установленные нативные модули (все уже в package.json)
- `expo-haptics` — тактильная отдача
- `react-native-keyboard-controller` — фиксы Android клавиатуры
- `expo-blur` — нативный blur (есть, проверить версию)
- `@shopify/flash-list` — замена FlatList
- `@gorhom/bottom-sheet` — нативные bottom sheets
- `react-native-mmkv` + `react-native-nitro-modules` — замена AsyncStorage
- `react-native-pager-view` — нативные табы

---

## План — 3 релиза

### v4.14.0 «UX polish» (текущая ветка)
**Безопасные изменения, без рефакторинга.**

- [x] `expo-haptics` — long-press, swipe-reply, send (готово в коде)
- [ ] `react-native-keyboard-controller` — обернуть `App.tsx` в `KeyboardProvider`, проверить что Android клавиатура не ломает layout в `ChatScreen`
- [ ] `expo-blur` в pinBar `ChatScreen.tsx` — заменить полупрозрачный фон на `<BlurView>`

**Закрытие:**
1. Дождаться готового APK с билда `02a61f66`
2. Пользователь тестирует на телефоне
3. Чеклист → bump app.json → CHANGELOG → коммит → push → tag `v4.14.0` → merge в main

### v4.15.0 «Lists & sheets»
**Рефакторинг рендеринга — повышенный риск.**

- `@shopify/flash-list` вместо `FlatList`:
  - `ChatScreen.tsx` — основной список сообщений (`inverted`, `keyExtractor`, memoized renderItem уже готовы из v4.12.0)
  - `ChatListScreen.tsx` — список чатов
  - Проверить что diffing по `_key` работает идентично
- `@gorhom/bottom-sheet`:
  - Панель реакций (сейчас обычный Modal)
  - Контекстное меню сообщения (long-press)
  - Bottom-sheet для emoji в инпуте (если применимо)

**Риски:** FlashList требует `estimatedItemSize`, может сломать перевёрнутый список. Тщательно протестировать прокрутку, новые сообщения, переход к старым.

### v4.16.0 «Storage & tabs»
**Миграция данных + UI рефакторинг.**

- `react-native-mmkv` вместо AsyncStorage в `src/services/auth.ts`:
  - Скрипт миграции: при старте читать AsyncStorage → писать в MMKV → стирать AsyncStorage
  - Сессия пользователя (`U`, PIN) переезжает
  - Кеш сообщений (если есть)
- `react-native-pager-view` для табов в `UserProfileScreen.tsx`:
  - Сейчас секции «Медиа / Файлы / Ссылки» рендерятся через стейт
  - Заменить на нативный PagerView со свайпами

**Риски:** миграция MMKV — критическая, потеря сессии = пользователь разлогинен. Сделать try/catch + fallback на AsyncStorage если MMKV недоступен.

---

## Правила работы (короткая выжимка из памяти)

- **Согласование перед разработкой**: план → подтверждение → разработка. «делай»/«делам» = сразу в работу.
- **Git workflow**: ветка `feat/<version>-<kebab-name>`, коммит+push только по команде «закрывай».
- **Версионирование**: триггер «закрывай» = ритуал (чеклист + bump app.json + CHANGELOG + коммит + push + tag + merge).
- **Naming**: задачи — императив «Что сделать?», коммиты — past tense «Что сделано?».
- **Качество кода**: ошибка = диагноз + план → ждать подтверждения, не править наугад.
- **Native widgets ≠ HTML**: проп на компоненте с системным ресурсом (клавиатура, фокус) проверять на уровне OS.
- **Нативные модули**: добавляем если дают функциональность, даже с пересборкой APK. Не искать кривые JS-аналоги.
- **Портирование web→RN**: точно копировать визуал и поведение из `/Users/rl/most/web-source/`, не упрощать.
- **Подагенты**: Explore при ≥3 grep/read; анонсировать 🔍 перед и ✅ после.
- **Экономия токенов**: не перечитывать файлы из контекста; не трогать сервер без запроса; не создавать файлы без запроса.

---

## Первые шаги новой сессии

1. Прочитать этот файл (`docs/HANDOFF_v4.14.md`).
2. Прочитать `MEMORY.md` (загружается автоматически).
3. Проверить статус EAS билда: `npx eas-cli build:view 02a61f66-5276-42e5-be99-e32c5280ab62` или https://expo.dev/accounts/romanlg/projects/most-native/builds/02a61f66-5276-42e5-be99-e32c5280ab62
4. Если билд готов — попросить пользователя установить APK и тестировать haptics.
5. Параллельно дописать оставшиеся фичи v4.14.0 (KeyboardProvider + BlurView в pinBar).
6. После теста и подтверждения — закрыть v4.14.0 ритуалом, затем v4.15.0 и v4.16.0.

## Файлы, которые понадобятся

- `App.tsx` — для KeyboardProvider обёртки
- `src/screens/ChatScreen.tsx` — pinBar (BlurView), потом FlashList, потом bottom-sheet реакций
- `src/screens/ChatListScreen.tsx` — FlashList
- `src/screens/UserProfileScreen.tsx` — PagerView
- `src/services/auth.ts` — MMKV миграция
- `src/components/MessageBubble.tsx` — уже с haptics, при v4.15.0 проверить совместимость с FlashList
- `app.json` — bump версии
- `CHANGELOG.md` — записи по релизам
