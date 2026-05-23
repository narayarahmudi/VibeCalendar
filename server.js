const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
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

// INTERNATIONAL TIME & DATE PARSER ENGINE 🌐
function parsePromptLogic(userPrompt) {
    const text = userPrompt.toLowerCase();
    const now = new Date(); 
    let hour = null; 
    let color = '#8ab4f8';
    let year = now.getFullYear(); 

    // 1. Parse Year
    const yearMatch = text.match(/\b(202\d|203\d)\b/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);

    // 2. Parse Month (English Only)
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

    // Parse relative indicators
    const daysLaterMatch = text.match(/(\d+)\s*days?\s*later/);
    const isRelative = text.includes('tomorrow') || text.includes('day after tomorrow') || daysLaterMatch;

    if (isRelative) {
        const relativeDate = new Date();
        if (text.includes('day after tomorrow')) {
            relativeDate.setDate(now.getDate() + 2);
        } else if (text.includes('tomorrow')) {
            relativeDate.setDate(now.getDate() + 1);
        } else if (daysLaterMatch) {
            const daysAmount = parseInt(daysLaterMatch[1], 10);
            relativeDate.setDate(now.getDate() + daysAmount);
        }
        month = relativeDate.getMonth();
        if (text.includes('birthday')) { hour = 0; }
    }

    if (month === null) return null;

    // 3. Parse Day Number
    let dayNum = null;
    const dateMatch = text.match(/(?:date|tgl|\bon\b)\s*(\d{1,2})/); 
    const genericNumbers = text.match(/\b(\d{1,2})\b/g); 

    if (text.includes('day after tomorrow')) {
        const lusa = new Date();
        lusa.setDate(now.getDate() + 2);
        dayNum = lusa.getDate();
    } else if (text.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        dayNum = tomorrow.getDate();
    } else if (daysLaterMatch) {
        const relativeDate = new Date();
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

    // 4. STRICT INTERNATIONAL TIME PARSER (AM/PM & 24H) ⏰
    if (text.includes('midnight')) {
        hour = 0;
    } else {
        // Detects: "at 7pm", "at 7 pm", "7pm", "7 am", "jam 14:00"
        const timeMatch = text.match(/\b(\d{1,2})\s*(?:[.:](\d{2}))?\s*(am|pm)\b/i);
        const strictAtMatch = text.match(/(?:at|jam|pukul)\s*(\d{1,2})\b/);

        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const ampm = timeMatch[3].toLowerCase();

            if (ampm === 'pm' && h < 12) h += 12;
            else if (ampm === 'am' && h === 12) h = 0;
            
            hour = h;
        } else if (strictAtMatch) {
            // Fallback for 24h military format like "at 14", "at 23"
            const h = parseInt(strictAtMatch[1], 10);
            if (h >= 0 && h <= 23) hour = h;
        } else {
            // Raw 24h format match like "14:00" or "23.00"
            const militaryMatch = text.match(/\b(\d{2})[.:](\d{2})\b/);
            if (militaryMatch) {
                const h = parseInt(militaryMatch[1], 10);
                if (h >= 0 && h <= 23) hour = h;
            }
        }
    }

    if (hour === null) return null;

    // 5. STYLISH ENGLISH CLEAN TITLE FILTER
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

    // Auto-Color Coding
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
app.listen(PORT, () => console.log(`🚀 VibeCalendar Server Active! Open in your browser: http://localhost:${PORT}`));