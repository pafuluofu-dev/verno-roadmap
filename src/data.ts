export type TrackId = 'A' | 'B'

export type ItemKind = 'course' | 'free' | 'practice' | 'milestone'

export interface Item {
  id: string
  track: TrackId
  kind: ItemKind
  title: string
  /** Инструктор, язык, пометки — выводится серым рядом с названием */
  meta?: string
  /** Что проходить, что пропускать, зачем */
  note: string
  /** Часы работы с практикой (то, что идёт в расписание) */
  hours: number
  /** Чистая длительность видео на Udemy, если есть */
  video?: number
  /** Коэффициент видео → работа, для подписи */
  factor?: number
  /** Необязательный шаг: можно снять галочкой «пропустить» */
  optional?: boolean
  /** Уже пройдено (Tilda) */
  done?: boolean
  /** Ссылка на сам материал: страница курса на Udemy, плейлист на YouTube, документация */
  url?: string
}

export interface Habit {
  track: TrackId
  time: string
  text: string
}

export interface Track {
  id: TrackId
  name: string
  goal: string
  color: string
}

export const TRACKS: Track[] = [
  {
    id: 'A',
    name: 'Фриланс — деньги как можно быстрее',
    goal: '100 тыс. ₽/мес на русских биржах по стеку verno-dev.com, потом зарубежные клиенты',
    color: 'var(--track-a)',
  },
  {
    id: 'B',
    name: 'Рост как программиста — fullstack',
    goal: 'TypeScript → Node/Express → БД → Docker → Next.js, пет-проект в портфолио, удалёнка за рубежом',
    color: 'var(--track-b)',
  },
]

/** Дата возвращения в вуз — после неё темп падает */
export const UNI_DATE = '2027-02-09'

/** Понедельник, с которого стартует план по умолчанию */
export const DEFAULT_START = '2026-09-07'

export const ITEMS: Item[] = [
  // ───────────────────────── Трек A — фриланс ─────────────────────────
  {
    id: 'a-tilda',
    track: 'A',
    kind: 'course',
    title: 'Создание сайтов и веб-дизайн в Tilda',
    meta: 'Фокеев · 14,5 ч видео · пройдено на 100 %',
    note: 'Лендинги 7–26 тыс. ₽ и бизнес-сайты 12–48 тыс. ₽ по прайсу verno-dev.com можно брать с сегодняшнего дня. Курсы ниже расширяют чек, а не открывают доступ к заказам.',
    hours: 0,
    video: 14.5,
    done: true,
    url: 'https://www.udemy.com/course/tilda-essential/',
  },
  {
    id: 'a-webflow',
    track: 'A',
    kind: 'course',
    title: 'Вёрстка и создание сайтов в Webflow',
    meta: 'Фокеев · 78 из 123 уроков',
    note: 'Осталось 45 уроков: позиционирование и фильтры, табы, формы, настройки, ускорение, анимации, адаптив, SEO, экспорт. Раздел 13 «Интернет-магазин» можно пропустить — Webflow-магазины в РФ почти не заказывают.',
    hours: 10,
    video: 6.4,
    factor: 1.5,
    url: 'https://www.udemy.com/course/webflow-s/',
  },
  {
    id: 'a-figma',
    track: 'A',
    kind: 'course',
    title: 'Веб-дизайн в Figma — с нуля, основы UX/UI',
    meta: 'Фокеев · выборочно',
    note: '~10 ч из 18: основы, цвет, AutoLayout (разделы 5 и 14), отступы, шрифты, дизайн-система и компоненты, адаптив, прототипирование, экспорт. Нужно, чтобы читать макеты заказчиков и рисовать простые лендинги самому. Картинки, маски, бонус по Photoshop — мимо.',
    hours: 15,
    video: 10,
    factor: 1.5,
    url: 'https://www.udemy.com/course/web-figma-ui/',
  },
  {
    id: 'a-theory',
    track: 'A',
    kind: 'course',
    title: 'Теория дизайна для веб-дизайнеров',
    meta: 'Фокеев',
    note: 'Короткий курс, поднимает качество лендингов, которые делаешь без дизайнера. Можно по вечерам параллельно с Webflow.',
    hours: 7,
    video: 6,
    factor: 1.2,
    url: 'https://www.udemy.com/course/cniiaptv/',
  },
  {
    id: 'a-sales-kit',
    track: 'A',
    kind: 'practice',
    title: 'Набор продавца: ТЗ, договор, предоплата, шаблоны откликов',
    note: 'Шаблон технического задания, короткий договор-оферта, правило «50 % предоплаты», три шаблона отклика под лендинг / бизнес-сайт / магазин. Один вечер, а потом экономит часы на каждом заказе и режет число невыгодных клиентов.',
    hours: 4,
  },
  {
    id: 'a-sochirca-1',
    track: 'A',
    kind: 'course',
    title: 'Весь WordPress и PHP, разделы 1–4',
    meta: 'Сокирка',
    note: 'База PHP (11 ч), кодекс темы (11 ч), практика темы (3 ч), кодекс плагинов (10 ч). Курс длится 244 ч — целиком не нужен, это ядро.',
    hours: 70,
    video: 35,
    factor: 2,
    url: 'https://www.udemy.com/course/all-wordpress/',
  },
  {
    id: 'm-a-wp',
    track: 'A',
    kind: 'milestone',
    title: 'В прайсе: доработки WordPress по коду',
    note: 'Правки тем и плагинов, хуки, интеграции — самая частая категория заказов на Kwork и FL.ru.',
    hours: 0,
  },
  {
    id: 'a-sochirca-2',
    track: 'A',
    kind: 'course',
    title: 'Весь WordPress и PHP, разделы 5–7',
    meta: 'Сокирка',
    note: 'Посадка HTML-шаблона на WP (15 ч), интернет-магазин на WooCommerce (12 ч), виджеты для Elementor (8 ч). Разделы 8–10 (WPBakery, SiteOrigin, Beaver) — мимо, 11–12 (155 ч практики) — как справочник под конкретный заказ.',
    hours: 70,
    video: 35,
    factor: 2,
    url: 'https://www.udemy.com/course/all-wordpress/',
  },
  {
    id: 'm-a-shop',
    track: 'A',
    kind: 'milestone',
    title: 'В прайсе: магазины на WooCommerce 15–65 тыс. ₽ и онлайн-школы на WP 20–55 тыс. ₽',
    note: 'Уже по твоему прайсу, а не по нижней планке.',
    hours: 0,
  },
  {
    id: 'a-kudlai-base',
    track: 'A',
    kind: 'course',
    title: 'PHP 8. От теории к практике',
    meta: 'Кудлай · справочник',
    note: 'Держи открытым рядом с первым разделом Сокирки и смотри только непонятное. Целиком (21 ч) — только если база PHP у Сокирки покажется слишком быстрой.',
    hours: 10,
    video: 5,
    factor: 2,
    optional: true,
    url: 'https://www.udemy.com/course/php-8-ua/',
  },
  {
    id: 'a-schiff',
    track: 'A',
    kind: 'course',
    title: 'Become a WordPress Developer',
    meta: 'Brad Schiff · EN · выборочно',
    note: 'Разделы 13–16 (REST API, AJAX), 18–19 (роли пользователей, пользовательский контент), 21 (деплой), 24 (Gutenberg-блоки на React). Это личные кабинеты для онлайн-школ на WP. Остальные 34 ч дублируют Сокирку.',
    hours: 24,
    video: 12,
    factor: 2,
    url: 'https://www.udemy.com/course/become-a-wordpress-developer-php-javascript/',
  },
  {
    id: 'a-acf',
    track: 'A',
    kind: 'course',
    title: 'WordPress Theme Development with ACF',
    meta: 'Riani · EN',
    note: 'ACF постоянно встречается в кастомных сайтах для клиентов. Его же курс по Elementor для Themeforest — мимо: это про продажу тем на маркетплейсе.',
    hours: 16,
    video: 11,
    factor: 1.5,
    optional: true,
    url: 'https://www.udemy.com/course/wordpress-advanced-theme-development-with-acf-acf-pro/',
  },
  {
    id: 'a-ai',
    track: 'A',
    kind: 'course',
    title: 'AI-разработка и создание AI-агентов',
    meta: 'Фокеев',
    note: 'Claude, основы LLM, агенты, ассистент в Telegram, сервисы автоматизации. Напрямую закрывает «AI-боты» в услугах — спрос есть, конкуренции меньше, чем в вёрстке.',
    hours: 10,
    video: 6.3,
    factor: 1.5,
    url: 'https://www.udemy.com/course/ai-ai-cph/',
  },
  {
    id: 'm-a-ai',
    track: 'A',
    kind: 'milestone',
    title: 'В прайсе: чат-боты на нейросетях для сайта и Telegram',
    note: 'Под «дополнительные услуги» с сайта: интеграции, AI-боты, сопровождение.',
    hours: 0,
  },
  {
    id: 'a-kudlai-oop',
    track: 'A',
    kind: 'course',
    title: 'PHP 8. ООП. Собственный MVC-фреймворк',
    meta: 'Кудлай',
    note: 'Фреймворк (16 ч): автозагрузка, роутинг, валидация, БД, авторизация, middleware, кеш. Потом CMS на нём (11 ч). Мост к Битриксу и к серьёзным плагинам WordPress. PHP после Сокирки ещё свежий — не откладывай.',
    hours: 54,
    video: 26.8,
    factor: 2,
    url: 'https://www.udemy.com/course/php-8-framework/',
  },
  {
    id: 'a-bitrix',
    track: 'A',
    kind: 'free',
    title: '1С-Битрикс для разработчиков',
    meta: 'dev.1c-bitrix.ru/learning · academy.1c-bitrix.ru',
    note: 'Официальные бесплатные курсы: сначала «Разработчик», потом «Администратор» выборочно. Для практики — пробная версия «Управление сайтом». 40 ч — оценка, поправь по факту.',
    hours: 40,
    url: 'https://dev.1c-bitrix.ru/learning/course/index.php?COURSE_ID=43',
  },
  {
    id: 'm-a-bitrix',
    track: 'A',
    kind: 'milestone',
    title: 'В прайсе: доработки и интеграции на Битриксе',
    note: 'Дорогие заказы русского рынка и мало исполнителей. Работает удалённо и после переезда.',
    hours: 0,
  },
  {
    id: 'a-getcourse',
    track: 'A',
    kind: 'free',
    title: 'GetCourse: администраторская часть',
    meta: 'Университет GetCourse · «Администратор GetCourse от А до Я»',
    note: 'Онлайн-школы на GetCourse заявлены на сайте, но курса в библиотеке нет. Проходи, когда придёт первый такой заказ — или заранее, если парсер показывает спрос. 15 ч — оценка.',
    hours: 15,
    optional: true,
    url: 'https://getcourse.ru/course/admin',
  },
  {
    id: 'a-shopify-1',
    track: 'A',
    kind: 'course',
    title: 'Complete Shopify Course 2026, разделы 2–5',
    meta: 'M C, Dennis C · EN',
    note: 'Настройка и кастомизация магазина, настройки, выполнение заказов. Дропшиппинг, print-on-demand и реклама (разделы 9–15) — для владельцев магазинов, не для разработчика.',
    hours: 6,
    video: 5,
    factor: 1.2,
    url: 'https://www.udemy.com/course/ultimate-shopify-course-beginner-to-shopify-expert-2024/',
  },
  {
    id: 'a-shopify-2',
    track: 'A',
    kind: 'course',
    title: 'The Complete Shopify Theme Development Course',
    meta: 'Rajinder Pal · EN',
    note: 'Shopify CLI, Liquid, секции темы, Alpine JS. Именно это продаётся как «разработка темы Shopify» на Upwork. В РФ Shopify почти не работает — это рынок зарубежных клиентов, важный с переездом.',
    hours: 32,
    video: 15.8,
    factor: 2,
    url: 'https://www.udemy.com/course/the-complete-shopify-theme-development-course/',
  },
  {
    id: 'm-a-shopify',
    track: 'A',
    kind: 'milestone',
    title: 'В прайсе: Shopify для зарубежных клиентов',
    note: 'Открывается англоязычный рынок — Upwork и подобные.',
    hours: 0,
  },
  {
    id: 'a-ux',
    track: 'A',
    kind: 'course',
    title: 'UX-веб-дизайн в Figma с нейросетями',
    meta: 'Фокеев',
    note: 'Самый полезный из оставшихся дизайн-курсов: аргументированный редизайн для бизнес-клиентов — услуга «редизайн» с сайта. Figma Pro, Motion-дизайн, Photoshop, Illustrator — только если решишь продавать дизайн отдельно.',
    hours: 19,
    video: 12.7,
    factor: 1.5,
    optional: true,
    url: 'https://www.udemy.com/course/ux-design-foundation/',
  },
  {
    id: 'a-multilink',
    track: 'A',
    kind: 'course',
    title: 'Мультиссылки и мини-сайты для Instagram',
    meta: 'SendPulse · 44 мин',
    note: 'Глянь за вечер, если по парсеру такие заказы попадаются, иначе пропускай.',
    hours: 1,
    video: 0.7,
    optional: true,
    url: 'https://www.udemy.com/course/multilink-for-instagram/',
  },

  // ───────────────────────── Трек B — fullstack ─────────────────────────
  {
    id: 'b-js',
    track: 'B',
    kind: 'free',
    title: 'JavaScript вглубь',
    meta: 'learn.javascript.ru',
    note: 'Разделы «Продвинутая работа с функциями» и «Асинхронность»: замыкания, промисы, Event Loop, микро- и макрозадачи. Первый пункт чек-листа DeepSeek — без этого не пишется серверный код.',
    hours: 15,
    url: 'https://learn.javascript.ru/advanced-functions',
  },
  {
    id: 'b-node',
    track: 'B',
    kind: 'course',
    title: 'Node.js — полный курс',
    meta: 'Стащук · обновлён 03/2026',
    note: 'Архитектура Node, цикл событий, модули, fs/path/http/stream, Express и API. Раздел 3 «Краткий курс по JavaScript» пропускай — это твоя база. Express руками до Next.js, как советовал Google AI.',
    hours: 35,
    video: 17.7,
    factor: 2,
    url: 'https://www.udemy.com/course/nodejs-ru/',
  },
  {
    id: 'b-sql',
    track: 'B',
    kind: 'free',
    title: 'SQL и PostgreSQL — основы',
    meta: 'DBeaver · Neon или Supabase',
    note: 'В библиотеке нет ни одного курса по SQL, а оба чек-листа ставят PostgreSQL в обязательный минимум. SELECT / JOIN / INSERT, связь users → orders, индексы на пальцах. Хватит любого бесплатного тренажёра.',
    hours: 10,
    url: 'https://pgexercises.com/',
  },
  {
    id: 'b-ts',
    track: 'B',
    kind: 'free',
    title: 'TypeScript — документация и handbook',
    note: 'Типы, generics, narrowing, utility-типы, tsconfig. В купленных курсах TypeScript встречается только у Ларичева и в SocketIO — базу лучше взять из первоисточника до них.',
    hours: 10,
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
  },
  {
    id: 'b-larichev',
    track: 'B',
    kind: 'course',
    title: 'Node.js — с нуля, основы и архитектура приложений',
    meta: 'Ларичев',
    note: 'Express, переход на TypeScript, DI (InversifyJS), Prisma поверх SQL, JWT, unit- и e2e-тесты. Единственный курс в наборе про TypeScript и архитектуру на бэкенде — проходи целиком.',
    hours: 36,
    video: 18.1,
    factor: 2,
    url: 'https://www.udemy.com/course/nodejs-start/',
  },
  {
    id: 'b-tissen',
    track: 'B',
    kind: 'course',
    title: 'Fullstack: React + Node.js/Express — два проекта',
    meta: 'Тиссен',
    note: 'Два проекта целиком, фронт и бэк вместе. Здесь React встречается с твоим новым бэкендом: контроллеры, авторизация, связь по API.',
    hours: 48,
    video: 24.1,
    factor: 2,
    url: 'https://www.udemy.com/course/fullstack-react-nodejsexpress/',
  },
  {
    id: 'm-b-api',
    track: 'B',
    kind: 'milestone',
    title: 'Свой API + React-фронт: можно брать интеграции и личные кабинеты на Node',
    note: 'Первые fullstack-заказы под «дополнительные услуги» с сайта.',
    hours: 0,
  },
  {
    id: 'b-mongo',
    track: 'B',
    kind: 'course',
    title: 'MongoDB — полный курс',
    meta: 'Стащук',
    note: 'После PostgreSQL, не вместо: Google AI прямо советует начинать с реляционной базы. Mongo нужна, потому что на ней держатся MERN-проекты и половина курсов по Node.',
    hours: 13,
    video: 8.7,
    factor: 1.5,
    url: 'https://www.udemy.com/course/mongodb-ru/',
  },
  {
    id: 'b-socketio',
    track: 'B',
    kind: 'course',
    title: 'SocketIO and TypeScript',
    meta: 'Bradley · EN',
    note: 'WebSockets из чек-листа DeepSeek плюс редкая вещь: деплой руками на VPS — nginx, домен, SSL. Тот самый «Linux, SSH, nginx, логи».',
    hours: 5,
    video: 2.9,
    factor: 1.5,
    url: 'https://www.udemy.com/course/typescript-socketio/',
  },
  {
    id: 'b-docker',
    track: 'B',
    kind: 'course',
    title: 'Docker и Docker Compose — деплой проекта с нуля',
    meta: 'Кочергин',
    note: 'Dockerfile, API + база + фронт в Compose, nginx, сети, деплой на сервер. Сразу после курса упакуй в Docker то, что сделал у Тиссена.',
    hours: 8,
    video: 3.7,
    factor: 2,
    url: 'https://www.udemy.com/course/docker-and-docker-compose/',
  },
  {
    id: 'm-b-deploy',
    track: 'B',
    kind: 'milestone',
    title: 'Умеешь поднять проект на VPS в Docker с nginx и SSL',
    note: 'Блок DevOps из чек-листа закрыт на уровне «сам разворачиваю то, что написал».',
    hours: 0,
  },
  {
    id: 'b-next-wp',
    track: 'B',
    kind: 'course',
    title: 'Next JS & WordPress: headless-сайты',
    meta: 'Phillips · EN · обновлён 07/2026',
    note: 'Next.js (pages router + раздел про переход на App Router), GraphQL, headless WordPress с ACF, Tailwind, деплой на Vercel. Связывает WordPress из трека A с fullstack.',
    hours: 17,
    video: 8.4,
    factor: 2,
    url: 'https://www.udemy.com/course/next-js-wordpress/',
  },
  {
    id: 'b-nextpizza',
    track: 'B',
    kind: 'free',
    title: 'NextPizza',
    meta: 'Archakov Blog · YouTube',
    note: 'Next.js App Router, TypeScript, Prisma, PostgreSQL, авторизация, корзина, оплата — курс из рекомендаций Google AI. Сюда приходишь уже с Express и SQL в руках, поэтому Server Actions не выглядят магией. 40 ч — оценка, длину плейлиста проверь.',
    hours: 40,
    url: 'https://www.youtube.com/watch?v=GUwizGbY4cc',
  },
  {
    id: 'b-cicd',
    track: 'B',
    kind: 'free',
    title: 'GitHub Actions — CI/CD для своего проекта',
    note: 'Линт + тесты + сборка Docker-образа на push. Хватит документации GitHub и одного вечера. Этот сайт, кстати, деплоится через такой же workflow.',
    hours: 5,
    url: 'https://docs.github.com/ru/actions',
  },
  {
    id: 'b-react-mid',
    track: 'B',
    kind: 'free',
    title: 'React до middle',
    meta: 'документация Redux Toolkit, react.dev',
    note: 'Redux Toolkit + RTK Query, memo / useMemo / useCallback, кастомные хуки, виртуализация списков. Не отдельный курс, а требования к коду пет-проекта — читаешь и сразу применяешь.',
    hours: 10,
    url: 'https://redux-toolkit.js.org/',
  },
  {
    id: 'b-pet',
    track: 'B',
    kind: 'practice',
    title: 'Пет-проект: парсер заказов как продукт',
    meta: 'Next.js App Router · PostgreSQL/Prisma · Telegram · Docker · GitHub Actions',
    note: 'У тебя уже есть парсер бирж с ежедневной сводкой. Перепиши его в продукт: фильтры по стеку, уведомления в Telegram, деплой в Docker на VPS, CI. Одновременно портфолио, инструмент для заказов и кейс «интеграции» на сайте. Вариант Б для iGaming — карточная игра «21» на React + PixiJS/GSAP и Node + Socket.IO.',
    hours: 100,
  },
  {
    id: 'm-b-portfolio',
    track: 'B',
    kind: 'milestone',
    title: 'Живой проект на Next.js + Node + PostgreSQL + Docker с публичным репозиторием',
    note: 'Главная строчка в резюме fullstack-джуна и главный кейс на verno-dev.com. Можно откликаться на удалёнку.',
    hours: 0,
  },
  {
    id: 'b-nest',
    track: 'B',
    kind: 'free',
    title: 'NestJS: «Облачное хранилище»',
    meta: 'Archakov Blog · Next.js + NestJS + TypeScript',
    note: 'Оба чек-листа говорят «отложить NestJS» — сюда приходишь после пет-проекта. 40 ч — оценка.',
    hours: 40,
    optional: true,
    url: 'https://www.youtube.com/watch?v=_oR1p79t6gw',
  },
  {
    id: 'b-hardening',
    track: 'B',
    kind: 'free',
    title: 'Безопасность, логирование, основы system design',
    meta: 'OWASP Top 10 · Winston/Pino · Sentry',
    note: 'Из «дополнительных слоёв» DeepSeek: CSRF/XSS/SQL-инъекции, rate limiting, CORS, логирование и алерты. Читаешь и добавляешь в пет-проект — так это и запоминается.',
    hours: 10,
    optional: true,
    url: 'https://owasp.org/www-project-top-ten/',
  },
  {
    id: 'b-pixi',
    track: 'B',
    kind: 'free',
    title: 'PixiJS + GSAP',
    meta: 'если iGaming всерьёз',
    note: 'Специализация из чек-листа DeepSeek: 2D-рендеринг, анимации, канвас. Берётся вместе с вариантом Б пет-проекта (карточная игра). 30 ч — оценка.',
    hours: 30,
    optional: true,
    url: 'https://pixijs.com/8.x/guides/getting-started/intro',
  },
  {
    id: 'b-rn',
    track: 'B',
    kind: 'course',
    title: 'React Native 2026 + React Native: Advanced Concepts',
    meta: 'Sawy, Grider · EN · 41 ч видео',
    note: 'Только если мобильная разработка станет целью. Курс Grider старый — проверь дату обновления, прежде чем тратить время.',
    hours: 80,
    video: 41,
    factor: 2,
    optional: true,
    url: 'https://www.udemy.com/course/the-best-react-native-course/',
  },
]

export const HABITS: Habit[] = [
  { track: 'A', time: '1 ч/день', text: 'Биржи: отклики по сводке парсера, переписка, оценка задач' },
  { track: 'A', time: 'каждый заказ', text: 'Кейс на verno-dev.com и отзыв на бирже — портфолио продаёт лучше курсов' },
  { track: 'A', time: '1 раз/нед', text: 'Свериться с парсером: какой стек реально заказывают — и переставить курсы, если картина другая' },
  { track: 'B', time: '20–30 мин/день', text: 'Codewars 6–7 kyu, позже LeetCode easy — алгоритмы для собеседований' },
  { track: 'B', time: '30 мин/день', text: 'Английский до B2: документация и видео по теме в оригинале, англоязычные курсы без субтитров' },
  { track: 'B', time: 'всегда', text: 'Читать документацию в первоисточнике, а не пересказы' },
]

import remindersJson from './reminders.json'

export interface Reminder {
  id: string
  /** ISO-дата разового напоминания (наступает с этой даты) */
  date?: string
  /** Повторяющееся: weekly — по дню недели, monthly — по числу месяца */
  repeat?: 'weekly' | 'monthly'
  /** День недели для weekly: 1 = понедельник … 7 = воскресенье */
  weekday?: number
  /** Число месяца для monthly: 1–28 */
  day?: number
  title: string
  text?: string
  link?: { hash: string; label: string }
}

/** Общие напоминания живут в reminders.json — его же читает workflow телеграм-бота */
export const REMINDERS: Reminder[] = remindersJson as Reminder[]

export const SKIPPED = [
  { title: 'WordPress Development 2026', meta: 'Madani · 14,5 ч', why: 'дубль Сокирки и Schiff; headless-часть — при заказе' },
  { title: 'WordPress Theme Development for Themeforest with Elementor', meta: 'Riani · 21,4 ч', why: 'продажа тем на маркетплейсе, не фриланс' },
  { title: 'Весь WordPress и PHP, разделы 8–12', meta: 'Сокирка · 172 ч', why: 'справочник под конкретный заказ' },
  { title: 'Become a WordPress Developer, остальные разделы', meta: 'Schiff · 34 ч', why: 'дубль' },
  { title: 'Complete Shopify Course, разделы 9–15', meta: '10 ч', why: 'дропшиппинг и реклама — для владельцев магазинов' },
  { title: 'Веб-дизайн в Figma — продвинутый, Motion-дизайн, Photoshop ×2, Illustrator', meta: '55 ч', why: 'разработчику не нужны, только если продавать дизайн отдельно' },
  { title: 'PHP 8. От теории к практике, остаток', meta: 'Кудлай · 16 ч', why: 'если база Сокирки окажется быстрой' },
]
