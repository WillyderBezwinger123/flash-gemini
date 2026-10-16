# ⚡ Flash Calendar & Routine Tasks (`flash-gemini`)

A native **Desktop (Windows/macOS/Linux via Electron)** and **Android Smartphone (via Capacitor)** Calendar & Routine Task application with **100% Free Cloud Synchronization**.

---

## ✨ Key Features

1. **Task Management**:
   - Create, delete, inline-rename (double-click any task title or click the edit icon), and mark tasks as done.
   - Priorities (`Low`, `Medium`, `High 🔥`), Categories, Reminders, and Color Labels.

2. **Flexible Routine Tasks Engine**:
   - **Daily**: Repeats every single day.
   - **Every 3 Days ("All Three Days")**: Repeats automatically every 3 days from the start date.
   - **Weekly**: Repeats on any selected days of the week (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`).
   - **Custom Routine Schedule**: Customize the exact interval (`Every N Days`, `Every N Weeks`, or `Every N Months`), custom start/end time, and optional end date.
   - **Per-Occurrence Completion & Streaks**: Marking today's routine as done checks it off for today without deleting future occurrences, tracks your **Current Streak 🔥**, and provides an interactive **Last 7 Days Completion Tracker**.

3. **Google Calendar-Style Built-In Calendar**:
   - **Day, Week, Month, and Schedule/Agenda Views**.
   - **24-Hour Time Grid** with a live red current-time indicator line.
   - **Drag-to-Create / Click-to-Create**: Drag across any time slot on the Day/Week calendar grid to create a task or routine for that exact time window.
   - **Mini Month Calendar & Layer Filters** in the collapsible sidebar.
   - **Dark Mode & Light Mode** support.

4. **100% Free Cloud Synchronization (Laptop ↔ Smartphone)**:
   - **Option A — GitHub Private Cloud Gist (Recommended, 100% Free Forever)**:
     - Click **"Auto-Connect My GitHub"** in the Desktop app's **Cloud Sync** modal to automatically provision a private `flash-calendar-sync.json` Gist on your GitHub account.
     - Click **"Copy Pairing Code for Phone"** and paste the `FLASH-SYNC-V1:...` code into the Android app to link both devices immediately.
   - **Option B — Supabase Free Tier Cloud PostgreSQL**:
     - Connect any free Supabase project URL & Anon Key (includes a 4-line SQL setup snippet inside the app).
   - **Offline-First**: Works offline on both Laptop and Smartphone and automatically merges changes using conflict-free per-item timestamps (`updatedAt`) and deletion tombstones.

---

## 🚀 Running the App

### 1. Native Desktop App (Windows Laptop via Electron)
```bash
# Launch the native Electron desktop window
npm run electron:start

# Or run in live-reload development mode
npm run electron:dev

# Package a standalone Windows portable executable in ./release
npm run electron:pack
```

### 2. Android Smartphone App (via Capacitor)
```bash
# Sync web bundle into the native Android project
npm run android:sync

# Open the native Android project in Android Studio to build/install the APK
npm run android:open
```