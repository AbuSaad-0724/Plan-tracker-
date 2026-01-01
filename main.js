// ========== AUTHENTICATION SYSTEM ==========
const AUTH_KEY = 'planner_auth_hash';
const SESSION_KEY = 'planner_session';

// Simple hash function for password
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Check authentication on load
function checkAuth() {
    const savedHash = localStorage.getItem(AUTH_KEY);
    const session = sessionStorage.getItem(SESSION_KEY);

    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');
    const loginBtn = document.getElementById('login-btn');
    const setupBtn = document.getElementById('setup-btn');
    const loginPassword = document.getElementById('login-password');
    const loginTitle = document.getElementById('login-title');
    const loginMsg = document.getElementById('login-msg');

    // If no password set, show setup screen
    if (!savedHash) {
        loginTitle.textContent = "Parol o'rnatish";
        loginMsg.textContent = "Ilovangizni himoyalash uchun parol yarating";
        loginBtn.style.display = 'none';
        setupBtn.style.display = 'flex';

        setupBtn.onclick = () => {
            const password = loginPassword.value.trim();
            if (password.length < 4) {
                showError("Parol kamida 4 ta belgidan iborat bo'lishi kerak!");
                return;
            }
            localStorage.setItem(AUTH_KEY, hashPassword(password));
            sessionStorage.setItem(SESSION_KEY, 'authenticated');
            showApp();
        };
    }
    // If already logged in this session
    else if (session === 'authenticated') {
        showApp();
    }
    // Show login screen
    else {
        loginBtn.onclick = () => {
            const password = loginPassword.value.trim();
            if (hashPassword(password) === savedHash) {
                sessionStorage.setItem(SESSION_KEY, 'authenticated');
                showApp();
            } else {
                showError("Noto'g'ri parol!");
            }
        };

        // Enter key support
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    function showApp() {
        loginOverlay.style.display = 'none';
        mainApp.style.display = 'flex';
        init(); // Initialize app after login
    }

    function showError(message) {
        loginMsg.textContent = message;
        loginMsg.style.color = '#ef4444';
        loginPassword.value = '';
        loginPassword.parentElement.classList.add('error-shake');
        setTimeout(() => {
            loginPassword.parentElement.classList.remove('error-shake');
            loginMsg.style.color = '';
            loginMsg.textContent = "Ilovaga kirish uchun parolni kiriting";
        }, 2000);
    }
}

// Run auth check immediately
checkAuth();

// ========== STATE MANAGEMENT ==========
// State Management
let hourlyPlans = JSON.parse(localStorage.getItem('hourly_plans')) || {};
let financeHistory = JSON.parse(localStorage.getItem('finance_history')) || [];
let quickPlans = JSON.parse(localStorage.getItem('quick_plans')) || [];
let currentTheme = localStorage.getItem('theme') || 'dark';

// Current Date Info
let displayDate = new Date();
let scheduleDate = new Date();

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const tabContents = document.querySelectorAll('.tab-content');
const themeToggle = document.getElementById('theme-toggle');

// Initialize App
function init() {
    setupNavigation();
    setupTheme();
    updateDateDisplay();
    renderDashboard();
    renderHourlySchedule();
    renderCalendar();
    renderFinance();
}

// 1. Navigation Logic
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetTab = link.dataset.tab;

            // UI Update
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) content.classList.add('active');
            });

            document.getElementById('page-title').textContent =
                link.querySelector('span').textContent + " Bo'limi";
        });
    });
}

// 2. Hourly Schedule Logic
function renderHourlySchedule() {
    const grid = document.getElementById('hourly-grid');
    if (!grid) return;

    const dateStr = scheduleDate.toISOString().split('T')[0];
    const dayData = hourlyPlans[dateStr] || {};

    grid.innerHTML = '';
    const datePicker = document.getElementById('schedule-date-picker');
    if (datePicker) datePicker.value = dateStr;

    for (let h = 6; h <= 23; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const row = document.createElement('div');
        row.className = 'hour-row';
        row.innerHTML = `
            <div class="hour-time">${timeStr}</div>
            <input type="text" class="hour-task-input" 
                   placeholder="Vazifa kiriting..." 
                   value="${dayData[timeStr] || ''}"
                   data-time="${timeStr}">
        `;

        row.querySelector('input').addEventListener('blur', (e) => {
            saveHourlyTask(dateStr, e.target.dataset.time, e.target.value);
        });

        grid.appendChild(row);
    }
}

function saveHourlyTask(date, time, task) {
    if (!hourlyPlans[date]) hourlyPlans[date] = {};
    hourlyPlans[date][time] = task;
    localStorage.setItem('hourly_plans', JSON.stringify(hourlyPlans));
    updateDashboardProgress();
    renderCalendar(); // Update dots on calendar
}

const datePicker = document.getElementById('schedule-date-picker');
if (datePicker) {
    datePicker.addEventListener('change', (e) => {
        scheduleDate = new Date(e.target.value);
        renderHourlySchedule();
    });
}

// 3. Calendar Logic (Monthly)
function renderCalendar() {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('current-month-year');
    if (!daysContainer || !monthYearText) return;

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthYearText.textContent = displayDate.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
    daysContainer.innerHTML = '';

    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
        daysContainer.innerHTML += '<div></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const hasTasks = hourlyPlans[dateStr] && Object.values(hourlyPlans[dateStr]).some(v => v !== '');

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isToday ? 'today' : ''}`;
        dayEl.innerHTML = `
            <span>${d}</span>
            ${hasTasks ? '<div style="width:4px;height:4px;background:#38bdf8;border-radius:50%;margin-top:2px;"></div>' : ''}
        `;

        dayEl.onclick = () => {
            scheduleDate = new Date(year, month, d);
            const scheduleTab = document.querySelector('[data-tab="schedule"]');
            if (scheduleTab) scheduleTab.click();
            renderHourlySchedule();
        };

        daysContainer.appendChild(dayEl);
    }
}

const prevBtn = document.getElementById('prev-month');
if (prevBtn) prevBtn.onclick = () => { displayDate.setMonth(displayDate.getMonth() - 1); renderCalendar(); };
const nextBtn = document.getElementById('next-month');
if (nextBtn) nextBtn.onclick = () => { displayDate.setMonth(displayDate.getMonth() + 1); renderCalendar(); };

// 4. Finance Logic
function renderFinance() {
    const list = document.getElementById('finance-list');
    const totalIncEl = document.getElementById('total-income');
    const totalExpEl = document.getElementById('total-expense');
    if (!list) return;

    list.innerHTML = '';
    let totalInc = 0;
    let totalExp = 0;

    financeHistory.forEach((item) => {
        if (item.type === 'income') totalInc += Number(item.amount);
        else totalExp += Number(item.amount);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.desc}</td>
            <td class="${item.type}-text">${item.type === 'income' ? '+' : '-'}${Number(item.amount).toLocaleString()} so'm</td>
        `;
        list.appendChild(row);
    });

    if (totalIncEl) totalIncEl.textContent = `${totalInc.toLocaleString()} so'm`;
    if (totalExpEl) totalExpEl.textContent = `${totalExp.toLocaleString()} so'm`;

    updateFinanceSummary(totalInc, totalExp);
}

const addFinanceBtn = document.getElementById('add-finance-btn');
if (addFinanceBtn) {
    addFinanceBtn.onclick = () => {
        const amount = document.getElementById('finance-amount').value;
        const desc = document.getElementById('finance-desc').value;
        const type = document.getElementById('finance-type').value;

        if (amount && desc) {
            financeHistory.unshift({
                id: Date.now(),
                date: new Date().toLocaleDateString(),
                amount, desc, type
            });
            localStorage.setItem('finance_history', JSON.stringify(financeHistory));
            document.getElementById('finance-amount').value = '';
            document.getElementById('finance-desc').value = '';
            renderFinance();
        }
    };
}

// 5. Dashboard Summary
function renderDashboard() {
    updateDateDisplay();
    updateDashboardProgress();
    renderFinance();
}

function updateDateDisplay() {
    const display = document.getElementById('date-display');
    if (!display) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    display.textContent = new Date().toLocaleDateString('uz-UZ', options);
}

function updateFinanceSummary(inc, exp) {
    const balanceFill = document.getElementById('balance-fill');
    if (!balanceFill) return;
    const ratio = inc === 0 ? 0 : Math.min((exp / inc) * 100, 100);
    balanceFill.style.width = `${100 - ratio}%`;
}

function updateDashboardProgress() {
    const textEl = document.getElementById('today-progress-text');
    if (!textEl) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const dayData = hourlyPlans[dateStr] || {};
    const filled = Object.values(dayData).filter(v => v !== '').length;
    const percent = Math.round((filled / 18) * 100);

    textEl.textContent = `${percent}%`;
}

// Theme Management
function setupTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        themeToggle.onclick = () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
        };
    }
}

// init() is called after successful login in checkAuth()
