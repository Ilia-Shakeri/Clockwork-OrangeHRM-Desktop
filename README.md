<div align="center">

<!-- ✅ App Logo (recommended path: docs/assets/logo.png) -->
<img src="docs/assets/logo.png" alt="Clockwork OrangeHRM Desktop Logo" width="1000" />

**Windows-first Desktop Attendance Toolkit for OrangeHRM**  
📊 Attendance Reports • 🗓️ Payroll Ranges  • 🧾 CSV/PDF Export • 🗃️ Multi-DB (MariaDB/MySQL/PostgreSQL/SQLite)

<p>
  <img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=000" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss&logoColor=white" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-Primary-0078D6?logo=windows&logoColor=white" />
</p>

<!-- OrangeHRM logo (as requested) -->
<p>
  <img width="30%" alt='OrangeHRM' src='https://raw.githubusercontent.com/wiki/orangehrm/orangehrm/logos/logo.svg#gh-light-mode-only'/>
 
</p>

<p>
  <a href="#english">English</a> •
  <a href="#fa">فارسی</a>
</p>

</div>

---

# English

## ✨ Overview

**Clockwork OrangeHRM Desktop** is a modern, Windows-first desktop app that streamlines **attendance reporting** and **payroll-range exports** for **OrangeHRM** by connecting directly to your database.  
It’s designed for HR/Finance/DevOps teams who need fast, repeatable reports, clean exports, and a local-only workflow.

---

## 🚀 Features

- 🧩 **Desktop shell** powered by Electron (Windows-first)
- 🔌 **Embedded local API** (runs on `127.0.0.1` only)
- 🗃️ **Multi-database connectivity**
  - ✅ MariaDB (default)
  - ✅ MySQL
  - ✅ PostgreSQL
  - ✅ SQLite (file-based)
- 🗓️ **Payroll-cycle ranges** (e.g., 26th (last month) → 25th (this month)) + custom ranges
- 🪐 **Jalali & Gregorian** date support
- 👤 **Users page** with DB-backed loading, search, and reusable local groups
- 📋 **Reports selection modes**: manual users or saved groups (with Select All / Clear All)
- ℹ️ **About page** with author details and social links
- ❤️ **Donate page** with wallet cards and QR support
- 🧾 **CSV / PDF exports** + export history
- 🟢 **Live Presence** view
- 🐍 (Optional) Python integration for summaries (resume-friendly)

---

## 🖼️ Screenshots

### Dashboard
| Light | Dark |
|---|---|
| ![Dashboard Light](docs/screenshots/light/01-dashboard.png) | ![Dashboard Dark](docs/screenshots/dark/01-dashboard.png) |

### Connections
| Light | Dark |
|---|---|
| ![Connections Light](docs/screenshots/light/02-connections.png) | ![Connections Dark](docs/screenshots/dark/02-connections.png) |

### Reports
| Light | Dark |
|---|---|
| ![Reports Light](docs/screenshots/light/03-reports.png) | ![Reports Dark](docs/screenshots/dark/03-reports.png) |

### Users Page
| Light | Dark |
|---|---|
| ![Users Light](docs/screenshots/light/06-users.png) | ![Users Dark](docs/screenshots/dark/06-users.png) |

### Groups Management
| Light | Dark |
|---|---|
| ![Groups Light](docs/screenshots/light/07-groups.png) | ![Groups Dark](docs/screenshots/dark/07-groups.png) |

### Export History
| Light | Dark |
|---|---|
| ![Export Light](docs/screenshots/light/04-export-history.png) | ![Export Dark](docs/screenshots/dark/04-export-history.png) |

### Live Presence
| Light | Dark |
|---|---|
| ![Presence Light](docs/screenshots/light/05-live-presence.png) | ![Presence Dark](docs/screenshots/dark/05-live-presence.png) |
---

## 🧱 Tech Stack

- Electron + React + TypeScript + Vite
- Tailwind CSS
- Express (Embedded Local API)
- MariaDB/MySQL: `mysql2`
- PostgreSQL: `pg`
- SQLite: Node runtime SQLite (file-based)
- `electron-store`, `zod`, PDF/CSV tooling

---

## ✅ Requirements

- Node.js **22.x** recommended
- npm 10+
- Windows (primary target)
- Access to an OrangeHRM-compatible database
- Python (optional)

---

## ⚡ Getting Started (Development)

```bash
git clone https://github.com/Ilia-Shakeri/Clockwork-OrangeHRM-Desktop.git
cd Clockwork-OrangeHRM-Desktop
npm install
npm run dev
```

---

## ⚙️ Configuration (Environment Variables)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Common keys:

* `DB_ENGINE`: `mariadb` | `mysql` | `postgres` | `sqlite`  *(default: `mariadb`)*
* `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
* `DB_SSL`: `true`/`false`
* `SQLITE_PATH`: path to `.sqlite` file
* Donation QR/logo assets: `src/assets/donate/`
* Optional custom social icon assets: `src/assets/social/`

> In-app settings are saved locally via `electron-store`.

---

## 🧭 How to Use (Inside the App)

### 1) Connections

1. Open **Connections**
2. Select DB engine
3. Enter credentials
4. Click **Test Connection**
5. Click **Save**

### 2) Users

* Load users directly from the connected OrangeHRM database
* Search users by username, full name, email, or employee ID
* Create and manage reusable groups (create, rename, update members, delete)

### 3) Reports

* Choose a preset payroll range (e.g., 26→25) or a custom range
* Select **Users** mode (manual list with Select All / Clear All) or **Group** mode
* In Group mode, selecting a group auto-selects all of its members
* Run report

### 4) Exports

* Export CSV/PDF
* View prior exports in **Export History**

### 5) About & Donate

* Use **About** for author details and social links
* Use **Donate** for wallet addresses and QR donation cards

---

## 🏗️ Build & Packaging (EXE / Installer / Portable)

This project uses `electron-builder` and outputs to the `release/` folder.

### ✅ Build

```bash
npm run build
```

### 🧩 Windows Installer (EXE / NSIS)

```bash
npm run build:installer
```

After build, you’ll typically find:

* `release/*Setup*.exe` (or similar)

### 📦 Portable (No Install)

If your current config targets NSIS, you can still generate portable builds:

**Option A (no code changes):**

```bash
npx electron-builder --win portable
```

**Option B (recommended script):** add to `package.json`

```json
"build:portable": "electron-builder --win portable"
```

Then run:

```bash
npm run build:portable
```

Optional ZIP:

```bash
npx electron-builder --win zip
```

---

## 📤 Releases (Recommended for Distribution)

You *don’t have to*, but **GitHub Releases** is the professional way to distribute:

* Versioned downloads
* Clean release notes
* Easy installer/portable access

Suggested workflow:

1. Create a tag (e.g., `v1.0.0`)
2. Create a GitHub Release
3. Attach artifacts from `release/` (Installer + Portable/ZIP)

---

## 🛡️ Security Notes

* Local API binds to `127.0.0.1` only
* Sensitive actions go through Electron IPC/preload layer
* Credentials stored locally (recommend OS-level disk encryption for best safety)

---

## 🤝 Contributing

PRs and Issues are welcome.
Please include steps to reproduce bugs and your environment details.

---

## 📄 License

MIT

---

## 👤 Author

**Ilia Shakeri**

---

<a id="fa"></a>

# فارسی

## ✨ معرفی

**Clockwork OrangeHRM Desktop** یک اپ دسکتاپ مدرن (هدف اصلی: ویندوز) برای **گزارش‌گیری حضور و غیاب** و **خروجی‌های حقوق و دستمزد** در OrangeHRM است که با اتصال مستقیم به دیتابیس، گزارش‌های سریع و قابل تکرار ارائه می‌دهد.

---

## 🚀 امکانات

* 🧩 پوسته دسکتاپ حرفه‌ای با Electron
* 🔌 API داخلی لوکال (فقط روی `127.0.0.1`)
* 🗃️ اتصال چند دیتابیس:
  * ✅ MariaDB (پیش‌فرض)
  * ✅ MySQL
  * ✅ PostgreSQL
  * ✅ SQLite
* 🗓️ بازه‌های آماده حقوقی (مثل 26→25) + بازه دلخواه
* 🪐 پشتیبانی تاریخ شمسی و میلادی
* 👤 صفحه **Users** برای بارگذاری کاربران از دیتابیس، جستجو، و مدیریت گروه‌ها
* 📋 حالت‌های انتخاب در **Reports**: انتخاب دستی کاربران یا انتخاب گروه ذخیره‌شده
* ℹ️ صفحه **About** برای معرفی پروژه، نویسنده، و لینک‌های اجتماعی
* ❤️ صفحه **Donate** برای حمایت مالی با کیف پول‌ها و QR
* 🧾 خروجی CSV / PDF + تاریخچه خروجی‌ها
* 🟢 صفحه Live Presence
* 🐍 (اختیاری) یکپارچه‌سازی Python برای خلاصه‌سازی گزارش‌ها

---

## 🖼️ اسکرین‌شات‌ها (Placeholder)

### داشبورد
| روشن | تیره |
|---|---|
| ![Dashboard Light](docs/screenshots/light/01-dashboard.png) | ![Dashboard Dark](docs/screenshots/dark/01-dashboard.png) |

### اتصال‌ها
| روشن | تیره |
|---|---|
| ![Connections Light](docs/screenshots/light/02-connections.png) | ![Connections Dark](docs/screenshots/dark/02-connections.png) |

### گزارش‌ها
| روشن | تیره |
|---|---|
| ![Reports Light](docs/screenshots/light/03-reports.png) | ![Reports Dark](docs/screenshots/dark/03-reports.png) |

### صفحه کاربران (Users)
| روشن | تیره |
|---|---|
| ![Users Light](docs/screenshots/light/06-users.png) | ![Users Dark](docs/screenshots/dark/06-users.png) |

### مدیریت گروه‌ها
| روشن | تیره |
|---|---|
| ![Groups Light](docs/screenshots/light/07-groups.png) | ![Groups Dark](docs/screenshots/dark/07-groups.png) |

### تاریخچه خروجی‌ها
| روشن | تیره |
|---|---|
| ![Export Light](docs/screenshots/light/04-export-history.png) | ![Export Dark](docs/screenshots/dark/04-export-history.png) |

### حضور لحظه‌ای
| روشن | تیره |
|---|---|
| ![Presence Light](docs/screenshots/light/05-live-presence.png) | ![Presence Dark](docs/screenshots/dark/05-live-presence.png) |

---

## ✅ پیش‌نیازها

* Node.js 22.x (پیشنهادی)
* npm 10+
* ویندوز (هدف اصلی)
* دیتابیس سازگار با OrangeHRM
* Python (اختیاری)

---

## ⚡ نصب و اجرا (Development)

```bash
git clone https://github.com/Ilia-Shakeri/Clockwork-OrangeHRM-Desktop.git
cd Clockwork-OrangeHRM-Desktop
npm install
npm run dev
```

---

## ⚙️ تنظیمات

`.env.example` را به `.env` کپی کن:

```bash
cp .env.example .env
```

کلیدهای رایج:

* `DB_ENGINE`: mariadb | mysql | postgres | sqlite  (پیش‌فرض: mariadb)
* `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
* `DB_SSL`: true/false
* `SQLITE_PATH`: مسیر فایل sqlite
* مسیر فایل‌های لوگو/QR کمک مالی: `src/assets/donate/`
* مسیر آیکون‌های اجتماعی سفارشی (اختیاری): `src/assets/social/`

> تنظیمات داخل برنامه به‌صورت لوکال با `electron-store` ذخیره می‌شود.

---

## 🧭 راهنمای استفاده

### 1) Connections

1. وارد **Connections** شو
2. نوع دیتابیس را انتخاب کن
3. اطلاعات اتصال را وارد کن
4. **Test Connection** را بزن
5. **Save** را بزن

### 2) Users

* کاربران را مستقیم از دیتابیس OrangeHRM بارگذاری کن
* کاربران را بر اساس نام، نام کاربری، ایمیل یا Employee ID جستجو کن
* گروه‌ها را بساز و مدیریت کن (ایجاد، ویرایش، تغییر اعضا، حذف)

### 3) Reports

* بازه آماده (مثل 26→25) یا بازه سفارشی را انتخاب کن
* بین حالت **انتخاب کاربران** و **انتخاب گروه** جابه‌جا شو
* در حالت کاربران از Select All / Clear All استفاده کن
* در حالت گروه با انتخاب گروه، اعضای آن به‌صورت خودکار انتخاب می‌شوند
* گزارش را اجرا کن

### 4) Exports

* خروجی CSV/PDF بگیر
* خروجی‌های قبلی را در **Export History** ببین

### 5) About & Donate

* در **About** اطلاعات پروژه، نویسنده، و لینک‌های اجتماعی را ببین
* در **Donate** آدرس کیف پول‌ها و QRهای کمک مالی را استفاده کن

---

## 🏗️ ساخت خروجی (EXE / Installer / Portable)

این پروژه با `electron-builder` خروجی می‌سازد و معمولاً داخل پوشه `release/` قرار می‌گیرد.

### Build

```bash
npm run build
```

### Installer (EXE / NSIS)

```bash
npm run build:installer
```

### Portable (بدون نصب)

بدون تغییر کد:

```bash
npx electron-builder --win portable
```

یا با اضافه کردن اسکریپت:

```json
"build:portable": "electron-builder --win portable"
```

و سپس:

```bash
npm run build:portable
```

ZIP:

```bash
npx electron-builder --win zip
```

---

## 📤 انتشار نسخه‌ها (پیشنهادی)

برای حرفه‌ای‌تر شدن و دانلود راحت:

1. Tag بساز (مثل `v1.0.0`)
2. GitHub Release بساز
3. فایل‌های خروجی `release/` را Attach کن

---

## 📄 لایسنس

MIT

---

## 👤 نویسنده

**Ilia Shakeri**
