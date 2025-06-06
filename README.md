# 📚 Telegram Student Notes Bot

A simple and efficient Telegram bot built with Node.js and Telegraf.js that helps students **upload**, **suggest**, and **download** subject-wise study notes. Admins can manage content and monitor usage.

---

## 🚀 Features

### 👥 For Students:
- `/start` — Get started with a welcome message and usage guide.
- `/notes <subject>` — Fetch all notes for a given subject.
- `/available` — View all available notes with subject and title.
- `/suggest <subject> <title> <url>` — Suggest notes for admin review.

### 🔒 For Admin:
- `/upload <subject> <title> <url>` — Upload approved notes.
- `/delete <subject> <title>` — Delete a note.
- `/usage` — View recent command logs.
- `/reviews` — View all user suggestions.
- `/edit_subject <old_subject> <title> <new_subject>` — Edit subject name.
- `/edit_title <subject> <old_title> <new_title>` — Edit title of a note.
