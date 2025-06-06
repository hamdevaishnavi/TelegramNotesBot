require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const NOTES_FILE = './notes.json';
const LOGS_FILE = './logs.json';
const SUGGESTIONS_FILE = './suggestions.json';

function readJSON(file) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
    return JSON.parse(fs.readFileSync(file));
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isAdmin(ctx) {
    return ctx.from.id.toString() === ADMIN_ID;
}

// /start command
bot.start((ctx) => {
    const welcomeMessage = `👋 Welcome to the Student Notes Bot!

📚 Commands you can use:
/notes <subject> - Get Notes
/available - View Subjects and Titles
/suggest <subject> <title> <url> - Submit your notes for review`;

    const adminCommands = `
👩‍🏫 Admin Only:
/upload <subject> <title> <url> - Add approved notes
/delete <subject> <title> - Delete a note
/usage - View usage logs
/reviews - View pending suggestions
/edit_subject <old_subject> <title> <new_subject> - Edit note subject
/edit_title <subject> <old_title> <new_title> - Edit note title`;

    if (isAdmin(ctx)) {
        ctx.reply(welcomeMessage + adminCommands);
    } else {
        ctx.reply(welcomeMessage);
    }
});

// Upload notes
bot.command('upload', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const parts = ctx.message.text.split(' ');
    const [_, subject, title, url] = parts;
    if (!subject || !title || !url) return ctx.reply('Usage: /upload <subject> <title> <url>');

    const notes = readJSON(NOTES_FILE);
    notes.push({ subject: subject.toUpperCase(), title, url });
    writeJSON(NOTES_FILE, notes);
    ctx.reply(`✅ Note added for ${subject.toUpperCase()}`);
});

// Delete notes
bot.command('delete', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const parts = ctx.message.text.split(' ');
    const subject = parts[1]?.toUpperCase();
    const title = parts[2];

    if (!subject || !title) {
        return ctx.reply('❌ Usage: /delete <subject> <title>');
    }

    let notes = readJSON(NOTES_FILE);
    const originalLength = notes.length;

    notes = notes.filter(n => !(n.subject === subject && n.title === title));

    if (notes.length === originalLength) {
        return ctx.reply(`⚠️ No note found with subject "${subject}" and title "${title}".`);
    }

    writeJSON(NOTES_FILE, notes);
    ctx.reply(`✅ Note deleted for subject "${subject}", title "${title}".`);
});

// Get notes
bot.command('notes', (ctx) => {
    const subject = ctx.message.text.split(' ')[1];
    if (!subject) return ctx.reply('Usage: /notes <subject>');

    const notes = readJSON(NOTES_FILE).filter(n => n.subject === subject.toUpperCase());
    if (notes.length === 0) return ctx.reply('No notes found.');

    notes.forEach(note => {
        ctx.reply(`${note.title} - [Download PDF](${note.url})`, { parse_mode: 'Markdown' });
    });

    
    const logs = readJSON(LOGS_FILE);
    logs.push({
        user: ctx.from.username || ctx.from.first_name,
        user_id: ctx.from.id,
        command: '/notes',
        subject: subject.toUpperCase(),
        timeStamp: new Date().toISOString()
    });
    writeJSON(LOGS_FILE, logs);
});

// Available notes
bot.command('available', (ctx) => {
    const notes = readJSON(NOTES_FILE);
    if (notes.length === 0) return ctx.reply('No notes available.');

    let message = '📚 Available Notes:\n\n';
    notes.forEach((note, index) => {
        message += `${index + 1}. Subject: ${note.subject}, Title: ${note.title}\n`;
    });

    ctx.reply(message);
});

// View usage logs
bot.command('usage', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const logs = readJSON(LOGS_FILE).slice(-10).reverse();
    if (logs.length === 0) return ctx.reply('No usage yet.');

    const summary = logs.map(log =>
        `${log.user} used /notes ${log.subject} at ${new Date(log.timeStamp).toLocaleString()}`
    );
    ctx.reply(summary.join('\n'));
});

// Suggest notes
bot.command('suggest', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const [_, subject, title, url] = parts;

    if (!subject || !title || !url) {
        return ctx.reply('❌ Usage: /suggest <subject> <title> <url>');
    }

    const suggestion = {
        subject: subject.toUpperCase(),
        title,
        url,
        submitted_by: ctx.from.username || ctx.from.first_name || 'Unknown',
        submitted_at: new Date().toISOString()
    };

    const suggestions = readJSON(SUGGESTIONS_FILE);
    suggestions.push(suggestion);
    writeJSON(SUGGESTIONS_FILE, suggestions);

    ctx.reply('✅ Your note suggestion has been submitted for review.');

    bot.telegram.sendMessage(
        ADMIN_ID,
        `📩 New note suggestion:\nSubject: ${suggestion.subject}\nTitle: ${title}\nURL: ${url}\nFrom: ${suggestion.submitted_by}`
    );
});

// View pending reviews
bot.command('reviews', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const suggestions = readJSON(SUGGESTIONS_FILE);
    if (suggestions.length === 0) return ctx.reply('No pending suggestions.');

    let message = '📃 Pending Suggestions:\n\n';
    suggestions.forEach((s, i) => {
        message += `#${i + 1}\nSubject: ${s.subject}\nTitle: ${s.title}\nURL: ${s.url}\nFrom: ${s.submitted_by}\n\n`;
    });

    ctx.reply(message);
});

// Edit subject (admin only)
bot.command('edit_subject', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3) return ctx.reply('Usage: /edit_subject <old_subject> <title> <new_subject>');

    const [oldSubject, title, newSubject] = args;
    let notes = readJSON(NOTES_FILE);

    const noteIndex = notes.findIndex(n => n.subject === oldSubject.toUpperCase() && n.title === title);
    if (noteIndex === -1) return ctx.reply(`No note found with subject "${oldSubject}" and title "${title}".`);

    notes[noteIndex].subject = newSubject.toUpperCase();
    writeJSON(NOTES_FILE, notes);

    ctx.reply(`✅ Subject updated from "${oldSubject}" to "${newSubject}" for title "${title}".`);
});

// Edit title (admin only)
bot.command('edit_title', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Unauthorized');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3) return ctx.reply('Usage: /edit_title <subject> <old_title> <new_title>');

    const [subject, oldTitle, newTitle] = args;
    let notes = readJSON(NOTES_FILE);

    const noteIndex = notes.findIndex(n => n.subject === subject.toUpperCase() && n.title === oldTitle);
    if (noteIndex === -1) return ctx.reply(`No note found with subject "${subject}" and title "${oldTitle}".`);

    notes[noteIndex].title = newTitle;
    writeJSON(NOTES_FILE, notes);

    ctx.reply(`✅ Title updated from "${oldTitle}" to "${newTitle}" in subject "${subject}".`);
});

// Start bot
bot.launch();
console.log("🤖 Bot is live and running!");

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
