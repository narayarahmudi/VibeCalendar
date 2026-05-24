const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // 🔥 Import SDK Supabase
const app = express();

app.use(cors());
app.use(express.json());

// Jalur statis wajib Vercel agar CSS & JS di folder public ter-load sempurna
app.use(express.static(path.join(__dirname, 'public')));

const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;

// ===================================================================
// ☁️ INITIALIZATION SUPABASE DATABASE CLOUD 
// ===================================================================
const SUPABASE_URL = 'https://ngnwofzzvrxieihrsaxg.supabase.co';
// ⚠️ GANTI teks di bawah ini pake anon/public API key rahasia lu yang dari tab API Settings!
const SUPABASE_KEY = 'sb_publishable_TMoW35OUl1BzpYvTM9gv8A_KEvfK-6m'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi pembantu buat bikin kode rahasia acak unik (Contoh hasil: VIBE-A72K)
function generateSecretCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Hilangkan huruf mirip angka (I, O, 0, 1)
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `VIBE-${code}`;
}

// Arahkan landing home ke index.html di dalam folder public lu
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/parse-prompt', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt cannot be empty!" });
    }

    try {
        const result = parsePromptLogic(prompt); 
        if (!result) {
            return res.status(422).json({ error: "Failed to parse prompt. Please make sure date, month, and time (AM/PM or 24h) are specified correctly." });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Server Error: " + err.message });
    }
});

// ===================================================================
// 📑 ENDPOINTS API BARU: RITUAL SINKRONISASI KODE RAHASIA BROWSER
// ===================================================================

// 🛠️ 1. USER BARU: DAFTAR NAMA & COCOKKAN KODE BARU KELUAR
app.post('/api/cloud-register', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
        const secretCode = generateSecretCode();
        
        // Taruh baris baru ke dalam tabel user_calendars di Supabase
        const { error } = await supabase
            .from('user_calendars')
            .insert([{ secret_code: secretCode, username: username, events_data: [] }]);

        if (error) throw error;

        // Balas ke frontend bawa tokennya
        res.json({ secretCode, username, events: [] });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// 🛠️ 2. USER LAMA: RESTORE DATA DARI PERANGKAT LAIN PAKE KODE
app.post('/api/cloud-login', async (req, res) => {
    const { secretCode } = req.body;
    if (!secretCode) return res.status(400).json({ error: 'Secret code required' });

    try {
        const { data, error } = await supabase
            .from('user_calendars')
            .select('username, events_data')
            .eq('secret_code', secretCode.trim().toUpperCase())
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Secret code not found or invalid!' });
        }

        // Oper balik nama asli dan array agendanya biar dirender frontend
        res.json({ secretCode, username: data.username, events: data.events_data });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// 🛠️ 3. BACKGROUND WORKER: AUTO SAVE TIAP ADA AGENDA BERUBAH
app.post('/api/cloud-sync', async (req, res) => {
    const { secretCode, events } = req.body;
    if (!secretCode) return res.status(400).json({ error: 'Secret code missing' });

    try {
        const { error } = await supabase
            .from('user_calendars')
            .update({ events_data: events })
            .eq('secret_code', secretCode.trim().toUpperCase());

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Cloud backup sync failed: ' + err.message });
    }
});

// ===================================================================
// 🌐 INTERNATIONAL TIME & DATE PARSER ENGINE (ANTI TIMEZONE BUG VERCEL)
// ===================================================================
function parsePromptLogic(userPrompt) {
    const text = userPrompt.toLowerCase();
    
    const localTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const now = new Date(localTimeString);
    
    let hour = null; 
    let color = '#8ab4f8';
    let year = now.getFullYear(); 

    const yearMatch = text.match(/\b(202\d|203\d)\b/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);

    let month = null; 
    const monthsList = [
        ['january', 'jan'], ['february', 'feb'], ['march', 'mar'], 
        ['april', 'apr'], ['may'], ['june', 'jun'], ['july', 'jul'], 
        ['august', 'aug'], ['september', 'sept', 'sep'], 
        ['october', 'oct'], ['november', 'nov'], ['december', 'dec']
    ];

    monthsList.forEach((mArray, index) => {
        mArray.forEach(mWord => {
            if (text.includes(mWord)) month = index;
        });
    });

    const daysLaterMatch = text.match(/(\d+)\s*days?\s*later/);
    const isRelative = text.includes('tomorrow') || text.includes('day after tomorrow') || daysLaterMatch;

    if (isRelative) {
        const relativeDate = new Date(now.getTime()); 
        if (text.includes('day after tomorrow')) {
            relativeDate.setDate(now.getDate() + 2);
        } else if (text.includes('tomorrow')) {
            relativeDate.setDate(now.getDate() + 1);
        } else if (daysLaterMatch) {
            const daysAmount = parseInt(daysLaterMatch[1], 10);
            relativeDate.setDate(now.getDate() + daysAmount);
        }
        month = relativeDate.getMonth();
    }

    if (month === null) return null;

    let dayNum = null;
    const dateMatch = text.match(/(?:date|tgl|\bon\b)\s*(\d{1,2})/); 
    const genericNumbers = text.match(/\b(\d{1,2})\b/g); 

    if (text.includes('day after tomorrow')) {
        const lusa = new Date(now.getTime());
        lusa.setDate(now.getDate() + 2);
        dayNum = lusa.getDate();
    } else if (text.includes('tomorrow')) {
        const tomorrow = new Date(now.getTime());
        tomorrow.setDate(now.getDate() + 1);
        dayNum = tomorrow.getDate();
    } else if (daysLaterMatch) {
        const relativeDate = new Date(now.getTime());
        relativeDate.setDate(now.getDate() + parseInt(daysLaterMatch[1], 10));
        dayNum = relativeDate.getDate();
    } else if (dateMatch) {
        dayNum = parseInt(dateMatch[1], 10);
    } else if (genericNumbers) {
        for (let numStr of genericNumbers) {
            const parsed = parseInt(numStr, 10);
            if (parsed >= 1 && parsed <= 31) { dayNum = parsed; break; }
        }
    }

    if (dayNum === null) return null;

    if (text.includes('birthday') || text.includes('ultah') || text.includes('midnight')) {
        hour = 0;
    } else {
        const timeMatch = text.match(/\b(\d{1,2})\s*(?:[.:](\d{2}))?\s*(am|pm)\b/i);
        const strictAtMatch = text.match(/(?:at|jam|pukul)\s*(\d{1,2})\b/);

        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const ampm = timeMatch[3].toLowerCase();

            if (ampm === 'pm' && h < 12) h += 12;
            else if (ampm === 'am' && h === 12) h = 0;
            
            hour = h;
        } else if (strictAtMatch) {
            const h = parseInt(strictAtMatch[1], 10);
            if (h >= 0 && h <= 23) hour = h;
        } else {
            const militaryMatch = text.match(/\b(\d{2})[.:](\d{2})\b/);
            if (militaryMatch) {
                const h = parseInt(militaryMatch[1], 10);
                if (h >= 0 && h <= 23) hour = h;
            }
        }
    }

    if (hour === null) return null;

    let cleanTitle = userPrompt
        .replace(/\b\d+\s*days?\s*later\b/gi, '') 
        .replace(/(?:jam|pukul|at)\s*\d{1,2}(?:[.:]\d{2})?\s*(?:pm|am)?/gi, '') 
        .replace(/\b\d{1,2}\s*(?:pm|am)\b/gi, '') 
        .replace(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/gi, '') 
        .replace(/(?:date|tgl|\bon\b)\s*\d{1,2}/gi, '') 
        .replace(/\b(202\d|203\d)\b/g, '') 
        .replace(/\b(00\.01|00\.00|12\.00|midnight)\b/gi, '')
        .replace(/\b(tomorrow|day after tomorrow)\b/gi, '') 
        .replace(/\b\d{1,2}\b/g, '') 
        .replace(/\s+/g, ' ').trim(); 

    let title = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : "New Event";

    if (text.includes('birthday')) color = '#f28b82'; 
    else if (text.includes('dinner') || text.includes('lunch') || text.includes('food')) color = '#f7cb4d'; 
    else if (text.includes('gym') || text.includes('sport') || text.includes('football') || text.includes('handball')) color = '#81c995'; 
    else if (text.includes('meeting') || text.includes('task') || text.includes('study') || text.includes('deadline')) color = '#8ab4f8'; 

    if (text.includes('red')) color = '#ff6b6b';
    else if (text.includes('green')) color = '#81c995';
    else if (text.includes('yellow')) color = '#f7cb4d';
    else if (text.includes('blue')) color = '#8ab4f8';

    const mmStr = String(month + 1).padStart(2, '0');
    const ddStr = String(dayNum).padStart(2, '0');

    return { title, dateStr: `${year}-${mmStr}-${ddStr}`, hour, color };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 VibeCalendar Server Active on port ${PORT}`));