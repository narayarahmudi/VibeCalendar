document.addEventListener('DOMContentLoaded', () => {
    // Welcome & Loading Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const usernameInput = document.getElementById('username-input');
    const loginBtn = document.getElementById('login-btn');
    const loadingScreen = document.getElementById('loading-screen');
    const mainAppLayout = document.getElementById('main-app-layout');
    const displayUserName = document.getElementById('display-user-name');

    // Calendar Core Elements
    const miniCalendarGrid = document.getElementById('mini-calendar');
    const mainCalendarGrid = document.getElementById('calendar-main-grid');
    const currentMonthYearLabel = document.getElementById('current-month-year');
    const todayBtn = document.getElementById('today-button');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const createBtn = document.getElementById('create-event-button');
    const promptPanel = document.getElementById('prompt-panel');
    const promptInput = document.getElementById('prompt-input');
    const submitPromptBtn = document.getElementById('submit-prompt');
    const eventModal = document.getElementById('event-modal');
    const closeModal = document.querySelector('.close-modal');
    const saveEventBtn = document.getElementById('save-event-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const colorOpts = document.querySelectorAll('.color-opt');
    const eventListContainer = document.getElementById('event-list-container');
    const monthViewBtn = document.getElementById('month-view-button');
    const weekViewBtn = document.getElementById('week-view-button');
    const dayViewBtn = document.getElementById('day-view-button');
    const searchInput = document.getElementById('search-events');

    // Detail Modal Elements
    const detailModal = document.getElementById('detail-modal');
    const closeDetailModal = document.querySelector('.close-detail-modal');
    const closeDetailBtn = document.getElementById('close-detail-btn');
    const detailTitle = document.getElementById('detail-title');
    const detailTime = document.getElementById('detail-time');

    // Mobile Elements
    const mobileToggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebarPanel = document.getElementById('sidebar-panel');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    let currentDate = new Date(); 
    let selectedColor = '#8ab4f8';
    let clickedSlotData = null; 
    
    // 🔥 INISIALISASI UTAMA: Ambil data dari key vibe_events
    let events = JSON.parse(localStorage.getItem('vibe_events')) || [];
    let currentView = window.innerWidth <= 768 ? 'day' : 'week';
    let searchQuery = '';
    let activeContextMenuEvent = null; 

    // Check existing session
    const savedName = localStorage.getItem('promptcal_user');
    if (savedName) {
        welcomeScreen.style.display = 'none';
        displayUserName.textContent = savedName;
        mainAppLayout.style.display = 'flex';
        initCalendar();
    }

    // Login Triggers with Animasi Loading Kinetik
    function handleLogin() {
        const name = usernameInput.value.trim();
        if (!name) { alert("Please enter your name first!"); return; }
        
        localStorage.setItem('promptcal_user', name);
        displayUserName.textContent = name;
        welcomeScreen.style.display = 'none';
        
        // Munculkan layar loading premium selama 1.8 detik
        loadingScreen.style.display = 'flex';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            mainAppLayout.style.display = 'flex';
            initCalendar();
        }, 1800);
    }

    loginBtn.onclick = handleLogin;
    usernameInput.onkeydown = (e) => { if (e.key === 'Enter') handleLogin(); };

    function initCalendar() {
        if(window.innerWidth <= 768) {
            setTimeout(() => {
                const dayBtn = document.getElementById('day-view-button');
                if(dayBtn) dayBtn.click();
            }, 100);
        }
        renderAll();
    }

    // Toggle Mobile Sidebar Laci Panel
    function toggleMobileSidebar() {
        sidebarPanel.classList.toggle('mobile-open');
        sidebarOverlay.classList.toggle('mobile-open');
    }
    if(mobileToggleBtn) mobileToggleBtn.onclick = toggleMobileSidebar;
    if(sidebarOverlay) sidebarOverlay.onclick = toggleMobileSidebar;

    // Custom Context Menu Creation
    const contextMenu = document.createElement('div');
    contextMenu.className = 'custom-context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item" id="ctx-add-here" style="font-weight: bold; color: #8ab4f8;">➕ Add Event at This Hour</div>
        <div class="context-menu-item" id="ctx-edit-name">✏️ Edit Event Name</div>
        <div class="context-menu-item" id="ctx-delete" style="color: #ff6b6b;">❌ Delete Event</div>
        <div class="context-color-dots">
            <div class="context-dot" data-color="#8ab4f8" style="background: #8ab4f8;"></div>
            <div class="context-dot" data-color="#f28b82" style="background: #f28b82;"></div>
            <div class="context-dot" data-color="#f7cb4d" style="background: #f7cb4d;"></div>
            <div class="context-dot" data-color="#81c995" style="background: #81c995;"></div>
            <div class="context-dot" data-color="#bb86fc" style="background: #bb86fc;"></div>
        </div>
    `;
    document.body.appendChild(contextMenu);

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? 'Light Mode' : 'Dark Mode';

    // 🔥 FIX FUNGSI LAMA: Kita arahkan semua ke saveEventsToStorage()
    function saveEvents() {
        saveEventsToStorage();
        renderEventsList();
    }

    function renderEventsList() {
        eventListContainer.innerHTML = '';
        const filtered = events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
        
        filtered.forEach((event) => {
            const li = document.createElement('li');
            li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
            li.style.padding = '8px'; li.style.marginBottom = '6px'; li.style.borderRadius = '8px';
            li.style.backgroundColor = 'var(--bg-input)'; li.style.borderLeft = `4px solid ${event.color}`; li.style.cursor = 'pointer';

            const left = document.createElement('div');
            left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '8px'; left.style.flexGrow = '1';

            left.onclick = (e) => {
                if (e.target.type !== 'checkbox') {
                    currentDate = new Date(event.timestamp);
                    if(window.innerWidth <= 768) toggleMobileSidebar();
                    renderAll();
                }
            };

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.checked = event.completed || false;
            checkbox.onchange = (e) => {
                e.stopPropagation(); event.completed = checkbox.checked; saveEvents(); renderAll();
            };

            const span = document.createElement('span');
            span.textContent = event.title;
            if (event.completed) { span.style.textDecoration = 'line-through'; span.style.opacity = '0.6'; }

            left.appendChild(checkbox); left.appendChild(span);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;'; deleteBtn.style.background = 'none'; deleteBtn.style.border = 'none';
            deleteBtn.style.color = '#ff6b6b'; deleteBtn.style.cursor = 'pointer'; deleteBtn.style.fontSize = '18px';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); events = events.filter(e => e !== event); saveEvents(); renderAll();
            };

            li.appendChild(left); li.appendChild(deleteBtn); eventListContainer.appendChild(li);
        });
    }

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return; 
        const found = events.find(e => e.title.toLowerCase().includes(query.toLowerCase()));
        if (found) { currentDate = new Date(found.timestamp); renderAll(); } else { alert('Event not found'); }
    }

    searchInput.onkeydown = (e) => { if (e.key === 'Enter') performSearch(); };
    searchInput.oninput = (e) => { searchQuery = e.target.value; renderEventsList(); renderMainGrid(); };

    function setViewActive(activeBtn, view) {
        [monthViewBtn, weekViewBtn, dayViewBtn].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active'); currentView = view; renderAll();
    }

    monthViewBtn.onclick = () => setViewActive(monthViewBtn, 'month');
    weekViewBtn.onclick = () => setViewActive(weekViewBtn, 'week');
    dayViewBtn.onclick = () => setViewActive(dayViewBtn, 'day');

    themeToggle.onclick = () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', nextTheme); localStorage.setItem('theme', nextTheme); 
        themeToggle.textContent = nextTheme === 'light' ? 'Light Mode' : 'Dark Mode';
    };

    colorOpts.forEach(opt => {
        opt.onclick = () => {
            colorOpts.forEach(o => o.classList.remove('active')); opt.classList.add('active');
            selectedColor = opt.getAttribute('data-color');
        };
    });

    function renderMiniCalendar() {
        miniCalendarGrid.innerHTML = '';
        const year = currentDate.getFullYear(); const month = currentDate.getMonth();
        const container = document.createElement('div'); container.className = 'mini-calendar-container';

        const header = document.createElement('div'); header.className = 'mini-calendar-header'; header.style.display = 'flex'; header.style.gap = '4px'; header.style.alignItems = 'center';

        const monthSelect = document.createElement('select'); monthSelect.style.background = 'var(--bg-input)'; monthSelect.style.color = 'var(--text-primary)'; monthSelect.style.border = '1px solid var(--border-color)'; monthSelect.style.borderRadius = '4px'; monthSelect.style.padding = '2px'; monthSelect.style.fontSize = '12px'; monthSelect.style.cursor = 'pointer';

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach((mName, i) => { const opt = document.createElement('option'); opt.value = i; opt.textContent = mName; if (i === month) opt.selected = true; monthSelect.appendChild(opt); });

        const yearSelect = document.createElement('select'); yearSelect.style.background = 'var(--bg-input)'; yearSelect.style.color = 'var(--text-primary)'; yearSelect.style.border = '1px solid var(--border-color)'; yearSelect.style.borderRadius = '4px'; yearSelect.style.padding = '2px'; yearSelect.style.fontSize = '12px'; yearSelect.style.cursor = 'pointer';

        for (let y = 2024; y <= 2030; y++) { const opt = document.createElement('option'); opt.value = y; opt.textContent = y; if (y === year) opt.selected = true; yearSelect.appendChild(opt); }

        monthSelect.onchange = () => { currentDate.setMonth(parseInt(monthSelect.value, 10)); renderAll(); };
        yearSelect.onchange = () => { currentDate.setFullYear(parseInt(yearSelect.value, 10)); renderAll(); };

        const navDiv = document.createElement('div'); navDiv.className = 'mini-nav'; navDiv.innerHTML = `<button id="mini-prev"><</button><button id="mini-next">></button>`;

        header.appendChild(monthSelect); header.appendChild(yearSelect); header.appendChild(navDiv); container.appendChild(header);

        const grid = document.createElement('div'); grid.className = 'mini-grid';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => { const span = document.createElement('span'); span.textContent = day; grid.appendChild(span); });

        const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div'); dayDiv.textContent = i;
            dayDiv.onclick = () => { currentDate = new Date(year, month, i); if(window.innerWidth <= 768) toggleMobileSidebar(); renderAll(); };
            if (i === currentDate.getDate() && month === currentDate.getMonth() && year === currentDate.getFullYear()) { dayDiv.style.backgroundColor = '#8ab4f8'; dayDiv.style.color = '#202124'; dayDiv.style.fontWeight = 'bold'; }
            grid.appendChild(dayDiv);
        }
        container.appendChild(grid); miniCalendarGrid.appendChild(container);

        document.getElementById('mini-prev').onclick = (e) => { e.stopPropagation(); currentDate.setMonth(currentDate.getMonth() - 1); renderAll(); };
        document.getElementById('mini-next').onclick = (e) => { e.stopPropagation(); currentDate.setMonth(currentDate.getMonth() + 1); renderAll(); };
    }

    function renderMainGrid() {
        let header = mainCalendarGrid.querySelector('.calendar-weekdays-header');
        if (!header) { header = document.createElement('div'); header.className = 'calendar-weekdays-header'; for (let i = 0; i < 7; i++) header.appendChild(document.createElement('span')); mainCalendarGrid.appendChild(header); }

        const oldBody = mainCalendarGrid.querySelector('.time-grid-body');
        if (oldBody) oldBody.remove();

        currentMonthYearLabel.textContent = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const startOfWeek = new Date(currentDate); startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const spans = header.querySelectorAll('span'); const numCols = currentView === 'day' ? 1 : 7;
        header.style.display = 'grid'; header.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
        
        spans.forEach((span, i) => {
            if (currentView === 'day') {
                if (i === 0) { span.style.display = 'flex'; span.innerHTML = `${currentDate.toLocaleString('en-US', { weekday: 'short' })}<br><strong>${currentDate.getDate()}</strong>`; span.classList.toggle('today', currentDate.toDateString() === new Date().toDateString()); } else { span.style.display = 'none'; }
            } else {
                span.style.display = 'flex'; const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i); span.innerHTML = `${day.toLocaleString('en-US', { weekday: 'short' })}<br><strong>${day.getDate()}</strong>`; span.classList.toggle('today', day.toDateString() === new Date().toDateString());
            }
        });

        const timeGrid = document.createElement('div'); timeGrid.className = 'time-grid-body'; timeGrid.style.display = 'grid'; timeGrid.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`; timeGrid.style.gridTemplateRows = 'repeat(24, 60px)';

        for (let row = 0; row < 24; row++) {
            for (let col = 0; col < numCols; col++) {
                const slot = document.createElement('div'); slot.className = 'time-slot';
                const slotDate = new Date(currentView === 'day' ? currentDate : startOfWeek);
                if (currentView !== 'day') slotDate.setDate(startOfWeek.getDate() + col);
                slotDate.setHours(row, 0, 0, 0); slot.dataset.timestamp = slotDate.getTime();
                
                slot.onclick = (e) => { if (e.target === slot) { clickedSlotData = { timestamp: slotDate.getTime() }; openModal(); } };

                const slotEvents = events.filter(e => { const eventDate = new Date(e.timestamp); return eventDate.getDate() === slotDate.getDate() && eventDate.getMonth() === slotDate.getMonth() && eventDate.getFullYear() === slotDate.getFullYear() && eventDate.getHours() === slotDate.getHours() && e.title.toLowerCase().includes(searchQuery.toLowerCase()); });

                if (slotEvents.length > 0) {
                    const sliderContainer = document.createElement('div'); sliderContainer.className = 'event-slider-container';
                    let currentSlideIndex = 0; const blocksArray = [];

                    slotEvents.forEach((evt, index) => {
                        const eventBlock = document.createElement('div'); eventBlock.className = 'event-item'; eventBlock.textContent = evt.title; eventBlock.style.backgroundColor = evt.color; eventBlock.title = evt.title; 
                        if (index === 0) eventBlock.classList.add('active-slide');
                        if (evt.completed) { eventBlock.style.textDecoration = 'line-through'; eventBlock.style.opacity = '0.5'; }

                        eventBlock.onclick = (e) => {
                            e.stopPropagation(); 
                            detailTitle.textContent = evt.title; 
                            
                            const detailNotesText = document.getElementById('detail-notes');
                            if (detailNotesText) {
                                detailNotesText.textContent = evt.details || 'No additional details.';
                            }

                            const d = new Date(evt.timestamp);
                            const rawHour = d.getHours();
                            const ampm = rawHour >= 12 ? 'PM' : 'AM';
                            const displayHour = rawHour === 0 ? 12 : (rawHour > 12 ? rawHour - 12 : rawHour);
                            const formattedTime = `${displayHour} ${ampm}`;

                            const formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                            detailTime.textContent = `${formattedDate} - ${formattedTime}`;
                            
                            detailModal.style.display = 'block';
                        };

                        eventBlock.oncontextmenu = (e) => {
                            e.preventDefault(); e.stopPropagation(); activeContextMenuEvent = evt; 
                            contextMenu.style.display = 'block'; contextMenu.style.left = `${e.clientX}px`; contextMenu.style.top = `${e.clientY}px`;
                        };
                        sliderContainer.appendChild(eventBlock); blocksArray.push(eventBlock);
                    });

                    if (slotEvents.length > 1) {
                        const prevBtn = document.createElement('button'); prevBtn.className = 'slide-btn prev-btn'; prevBtn.innerHTML = '‹';
                        prevBtn.onclick = (e) => { e.stopPropagation(); blocksArray[currentSlideIndex].classList.remove('active-slide'); currentSlideIndex = (currentSlideIndex - 1 + blocksArray.length) % blocksArray.length; blocksArray[currentSlideIndex].classList.add('active-slide'); };

                        const nextBtn = document.createElement('button'); nextBtn.className = 'slide-btn next-btn'; nextBtn.innerHTML = '›';
                        nextBtn.onclick = (e) => { e.stopPropagation(); blocksArray[currentSlideIndex].classList.remove('active-slide'); currentSlideIndex = (currentSlideIndex + 1) % blocksArray.length; blocksArray[currentSlideIndex].classList.add('active-slide'); };

                        sliderContainer.appendChild(prevBtn); sliderContainer.appendChild(nextBtn);
                    }
                    slot.appendChild(sliderContainer);
                }
                timeGrid.appendChild(slot);
            }
        }
        mainCalendarGrid.appendChild(timeGrid);
    }

    document.addEventListener('click', () => { contextMenu.style.display = 'none'; });

    document.getElementById('ctx-add-here').onclick = (e) => { e.stopPropagation(); if (activeContextMenuEvent) { clickedSlotData = { timestamp: activeContextMenuEvent.timestamp }; openModal(); } contextMenu.style.display = 'none'; };
    document.getElementById('ctx-edit-name').onclick = (e) => { e.stopPropagation(); if (activeContextMenuEvent) { const newName = prompt("Enter new name for this event:", activeContextMenuEvent.title); if (newName && newName.trim()) { activeContextMenuEvent.title = newName.trim(); saveEvents(); renderAll(); } } contextMenu.style.display = 'none'; };
    document.getElementById('ctx-delete').onclick = (e) => { e.stopPropagation(); if (activeContextMenuEvent) { events = events.filter(e => e !== activeContextMenuEvent); saveEvents(); renderAll(); } contextMenu.style.display = 'none'; };

    contextMenu.querySelectorAll('.context-dot').forEach(dot => { dot.onclick = (e) => { e.stopPropagation(); if (activeContextMenuEvent) { activeContextMenuEvent.color = dot.getAttribute('data-color'); saveEvents(); renderAll(); } contextMenu.style.display = 'none'; }; });

    closeDetailModal.onclick = () => detailModal.style.display = 'none';
    closeDetailBtn.onclick = () => detailModal.style.display = 'none';

    function openModal() { eventModal.style.display = 'block'; document.getElementById('event-title').focus(); }
    closeModal.onclick = () => eventModal.style.display = 'none';
    
    const eventTitleInput = document.getElementById('event-title');
    eventTitleInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); saveEventBtn.click(); } };

    saveEventBtn.onclick = () => {
        const title = eventTitleInput.value.trim();
        const details = document.getElementById('event-details').value.trim(); 
        if (title && clickedSlotData) {
            const eventData = { title, details: details || 'No additional details.', color: selectedColor, completed: false, timestamp: clickedSlotData.timestamp };
            events.push(eventData); saveEvents(); renderAll();
            eventTitleInput.value = ''; document.getElementById('event-details').value = ''; eventModal.style.display = 'none';
        }
    };

    function animateTransition() {
        const grid = document.getElementById('calendar-main-grid'); grid.style.transform = 'translateX(20px)'; grid.style.opacity = '0';
        setTimeout(() => { grid.style.transform = 'translateX(0)'; grid.style.opacity = '1'; }, 150);
    }

    // ===================================================================
    // 🎯 SMART VIBE CHECK / MOOD ANALYTICS ENGINE (BALANCED & FIXED)
    // ===================================================================
    function updateVibeAnalytics() {
        const vibeRing = document.querySelector('.vibe-progress-ring');
        const vibePercentText = document.getElementById('vibe-percentage');
        const vibeStatusText = document.getElementById('vibe-status');
        const vibeDescText = document.getElementById('vibe-desc');
        const activeUser = localStorage.getItem('promptcal_user') || 'User';

        if (!vibeRing || !events.length) {
            if(vibeStatusText) vibeStatusText.textContent = "Chill Mode";
            if(vibeDescText) vibeDescText.textContent = "No tasks, full cozy vibe.";
            if(vibePercentText) vibePercentText.textContent = "100%";
            if(vibeRing) vibeRing.style.background = `conic-gradient(#81c995 100%, var(--bg-card) 0%)`;
            return;
        }

        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);

        const weeklyEvents = events.filter(e => e.timestamp >= startOfWeek.getTime() && e.timestamp <= endOfWeek.getTime());

        if (weeklyEvents.length === 0) {
            vibeStatusText.textContent = "Chill Mode";
            vibeDescText.textContent = "Clear schedule this week.";
            vibePercentText.textContent = "100%";
            vibeRing.style.background = `conic-gradient(#81c995 100%, var(--bg-card) 0%)`;
            return;
        }

        let uncompletedCount = 0;
        let stressWeight = 0;
        let purpleBonusPoints = 0; 

        weeklyEvents.forEach(e => {
            if (e.completed) return; 
            uncompletedCount++;
            if (e.color === '#f28b82') stressWeight += 25;      
            else if (e.color === '#f7cb4d') stressWeight += 15; 
            else if (e.color === '#bb86fc') purpleBonusPoints += 15; 
            else stressWeight += 8;                             
        });

        let goodVibePercentage = 100;
        if (uncompletedCount > 0) {
            let baseVibe = 100 - stressWeight;
            goodVibePercentage = Math.min(100, Math.max(0, baseVibe + purpleBonusPoints));
        }

        vibePercentText.textContent = `${goodVibePercentage}%`;
        
        if (goodVibePercentage >= 75) {
            vibeStatusText.textContent = "Chill & Productive";
            vibeStatusText.style.color = "#81c995";
            vibeDescText.textContent = "Schedule is balanced perfectly.";
            vibeRing.style.background = `conic-gradient(#81c995 ${goodVibePercentage}%, var(--bg-card) 0%)`;
        } else if (goodVibePercentage >= 45) {
            vibeStatusText.textContent = "Steady Grind";
            vibeStatusText.style.color = "#f7cb4d";
            vibeDescText.textContent = `Keep rolling, ${activeUser}! You got this.`;
            vibeRing.style.background = `conic-gradient(#f7cb4d ${goodVibePercentage}%, var(--bg-card) 0%)`;
        } else {
            vibeStatusText.textContent = "Overloaded Stressed";
            vibeStatusText.style.color = "#f28b82";
            vibeDescText.textContent = "Too many active tasks! Take a break.";
            vibeRing.style.background = `conic-gradient(#f28b82 ${goodVibePercentage}%, var(--bg-card) 0%)`;
        }
    }

    function renderAll() { 
        if (localStorage.getItem('promptcal_user')) {
            renderMiniCalendar(); renderMainGrid(); renderEventsList(); animateTransition(); 
            updateVibeAnalytics(); 
        }
    }

    createBtn.onclick = () => {
        promptPanel.style.display = promptPanel.style.display === 'none' ? 'block' : 'none';
        if (promptPanel.style.display === 'block') promptInput.focus();
    };

    promptInput.onkeydown = (e) => { if (e.key === 'Enter') submitPromptBtn.click(); };
    todayBtn.onclick = () => { currentDate = new Date(); renderAll(); };
    
    prevWeekBtn.onclick = () => {
        if (currentView === 'day') currentDate.setDate(currentDate.getDate() - 1);
        else currentDate.setDate(currentDate.getDate() - 7);
        renderAll();
    };
    nextWeekBtn.onclick = () => {
        if (currentView === 'day') currentDate.setDate(currentDate.getDate() + 1);
        else currentDate.setDate(currentDate.getDate() + 7);
        renderAll();
    };

    // SECURE ABSOLUTE ENDPOINT FETCH
    submitPromptBtn.onclick = () => {
        const promptText = promptInput.value.trim();
        if (!promptText) return;

        submitPromptBtn.textContent = "AI thinking... 🤔";
        submitPromptBtn.disabled = true;

        fetch('/api/parse-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Failed to process prompt"); });
            return res.json();
        })
        .then(aiResult => {
            submitPromptBtn.textContent = "Add Event"; submitPromptBtn.disabled = false;

            if (aiResult) {
                const [year, month, day] = aiResult.dateStr.split('-').map(Number);
                const targetDate = new Date(year, month - 1, day);
                targetDate.setHours(aiResult.hour, 0, 0, 0);

                const lowerPrompt = promptText.toLowerCase();
                let finalColor = aiResult.color || '#8ab4f8'; 

                if (/exam|deadline|test|urgent|heavy|hard|ujian|tugas|penting|parah|susah/.test(lowerPrompt)) {
                    finalColor = '#f28b82';
                } 
                else if (/meeting|review|homework|study|project|rapat|belajar|kerjaan|pr/.test(lowerPrompt)) {
                    finalColor = '#f7cb4d';
                } 
                else if (/game|gacha|genshin|birthday|healing|party|main|ultah|pesta|libur|hepi/.test(lowerPrompt)) {
                    finalColor = '#bb86fc';
                } 
                else if (/sleep|relax|chill|rest|movie|dinner|santai|tidur|istirahat|nonton|makan/.test(lowerPrompt)) {
                    finalColor = '#81c995';
                }
                else if (/routine|class|lecture|workout|gym|kuliah|sekolah|olahraga|biasa/.test(lowerPrompt)) {
                    finalColor = '#8ab4f8';
                }

                const newEvent = { 
                    title: aiResult.title, 
                    color: finalColor, 
                    completed: false, 
                    timestamp: targetDate.getTime(),
                    details: aiResult.details || "Generated via Intelligent Prompt."
                };
                
                events.push(newEvent); 
                saveEvents(); // 🔥 Ini otomatis nembak ke localStorage yang benar!

                currentDate = targetDate;
                renderAll();
                promptInput.value = ''; 
                promptPanel.style.display = 'none';
            }
        })
        .catch(err => {
            submitPromptBtn.textContent = "Add Event"; submitPromptBtn.disabled = false; alert("⚠️ " + err.message);
        });
    };

    // ===================================================================
    // ⚙️ SETTINGS DROPDOWN & SESSION RESET CONTROLLER
    // ===================================================================
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const resetAccountBtn = document.getElementById('reset-account-btn');

    if (settingsToggleBtn && settingsDropdown) {
        settingsToggleBtn.onclick = (e) => {
            e.stopPropagation();
            settingsDropdown.style.display = settingsDropdown.style.display === 'none' ? 'block' : 'none';
        };
    }

    document.addEventListener('click', () => {
        if (settingsDropdown) settingsDropdown.style.display = 'none';
    });

    // Eksekutor Hapus Akun Dashboard / Reset Session (FIXED & SYNCED!)
    if (resetAccountBtn) {
        resetAccountBtn.onclick = (e) => {
            e.stopPropagation();
            
            if (confirm("Are you sure you want to reset your account session? This will clear your current profile display.")) {
                // 1. Sapu bersih session nama
                localStorage.removeItem('promptcal_user');
                
                // 🔥 2. SAPU BERSIH JADWAL: Dari localstorage dan array memori internal
                localStorage.removeItem('vibe_events');
                events = []; 
                
                // Sembunyikan aplikasi, balikin ke welcome screen awal
                mainAppLayout.style.display = 'none';
                welcomeScreen.style.display = 'flex';
                usernameInput.value = ''; 
                
                if (settingsDropdown) settingsDropdown.style.display = 'none';
                
                renderAll(); 
            }
        };
    }

    renderAll();
});

// 🔥 SAKLAR SAVING UTAMA: Dipanggil di semua state perubahan biar masuk ke key vibe_events
function saveEventsToStorage() {
    localStorage.setItem('vibe_events', JSON.stringify(events));
}