const APP_VERSION = "4.5.7";

// ==========================================
// KONFIGURACJA
// ==========================================
const DISCORD_WEBHOOK_URL = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/zloto"; 
const PIN_API_URL = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/pin";
const REPORTS_API_URL = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports";

// Ceny materiałów i wymogi (receptura na 1 sztabkę)
const goldInventory = [
    { name: "Złote kolczyki", price: 200, reqPerBar: 20 },
    { name: "Złota bransoletka", price: 200, reqPerBar: 20 },
    { name: "Złota moneta", price: 200, reqPerBar: 10 }
];

// OSTATECZNA CENA SZTABKI ZŁOTA
const PRICE_PER_GOLD_BAR = 15000; 

let currentEmployeeName = "";
let currentCounts = {};
let isBoss = false;

// ==========================================
// UNIWERSALNY SYSTEM LOGOWANIA DO BAZY (DZIENNIK ZDARZEŃ)
// ==========================================
window.addSystemLog = async function(type, description) {
    const who = window.currentEmployeeName || currentEmployeeName || "Nieznany Szef";
    try {
        fetch(REPORTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // <--- DODANY NAGŁÓWEK
            body: JSON.stringify({
                action: 'save_log',
                date: getFormattedDateTime(), // <--- DODANY LOKALNY CZAS
                employee: who,
                type: type,
                description: description
            })
        });
    } catch (e) {
        console.error("Błąd zapisu logu:", e);
    }
};

// --- EFEKTY CYFROWEGO ODLICZANIA I PULSOWANIA ---
let previousTotalCost = 0;

window.animateValue = function(element, start, end, duration) {
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 5);
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        element.innerText = currentVal + '$';
        if (progress < 1) window.requestAnimationFrame(step);
        else element.innerText = end + '$';
    };
    window.requestAnimationFrame(step);
};

window.triggerPulseEffect = function(totalId, badgeId) {
    const totalEl = document.getElementById(totalId);
    if (totalEl) {
        totalEl.classList.remove('pulse-anim');
        void totalEl.offsetWidth;
        totalEl.classList.add('pulse-anim');
    }
};
// ------------------------------------------------

const delay = ms => new Promise(res => setTimeout(res, ms));

function getFormattedDate() {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) {
        loginPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    // --- INICJALIZACJA ZAPISANEGO PROFILU NA STARCIE ---
    if (typeof window.checkSavedBossProfile === 'function') window.checkSavedBossProfile();
});

// Nasłuchiwanie scrolla, żeby zwinąć pasek w ikonki
document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

async function login() {
    const pin = document.getElementById('employee-login-pin').value;
    const btn = document.getElementById('login-btn');
    if (!pin) return showNotice("Wprowadź PIN!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            if (data.role && data.role.toLowerCase() === 'szef') {
                // --- SYSTEM ZAPAMIĘTYWANIA PROFILU ---
                const rememberMeCheckbox = document.getElementById('remember-me-checkbox');
                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    let savedProfiles = JSON.parse(localStorage.getItem('elcartel_gold_profiles') || '[]');
                    savedProfiles = savedProfiles.filter(p => p.name !== data.name);
                    savedProfiles.push({ 
                        name: data.name, 
                        pin: pin, 
                        photo: data.photo || '',
                        ssn: data.ssn || '---',
                        dateZatrudnienia: data.dateZatrudnienia || 'Brak danych',
                        rank: data.rank || 'Pracownik' // Pobieranie faktycznego stopnia z bazy
                    });
                    localStorage.setItem('elcartel_gold_profiles', JSON.stringify(savedProfiles));
                    if (typeof renderSavedProfiles === 'function') renderSavedProfiles();
                }
                // ------------------------------------

                // --- EFEKT FACE ID (otwieranie kłódki) ---
                const mainIcon = document.querySelector('.login-icon');
                if (mainIcon) {
                    mainIcon.classList.remove('fa-lock');
                    mainIcon.classList.add('fa-unlock', 'icon-unlock-anim');
                }

                // Opóźnienie na zjazd ekranu, by było widać animację
                setTimeout(() => {
                    currentEmployeeName = data.name;
                    isBoss = true;
                    
                    document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
                    document.getElementById('login-screen').classList.remove('active');
                    document.getElementById('main-app').style.display = 'block';
                    document.getElementById('user-profile').style.display = 'block';
                    document.getElementById('header-date').innerText = getFormattedDate();
                    
                    // DODANIE LOGU
                    window.addSystemLog('LOGOWANIE', `Zalogowano do panelu odlewni.`);

                    renderGoldItems();
                    loadWarehouseData();

                    document.getElementById('boss-stats-section').style.display = 'block';
                    document.getElementById('admin-tools-trigger').style.display = 'block';
                    loadGoldStats(); 
                    
                    showNotice(`Witaj w odlewni ${data.name}!`, "success");
                    btn.disabled = false;
                    btn.innerHTML = 'Zaloguj <i class="fas fa-lock"></i>';
                }, 600);
            } else {
                showNotice("Nie jesteś uprawniony, aby się zalogować.", "danger");
                document.getElementById('employee-login-pin').value = "";
                btn.disabled = false;
                btn.innerHTML = 'Zaloguj <i class="fas fa-lock"></i>';
            }
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
            window.addSystemLog('BŁĘDNY PIN', `Niewłaściwa próba autoryzacji do panelu odlewni (Użyto niepoprawnego kodu PIN w zloto.html).`);
            btn.disabled = false;
            btn.innerHTML = 'Zaloguj <i class="fas fa-lock"></i>';

            // --- EFEKT BŁĘDNEGO PINU (trzęsienie) ---
            const mainIcon = document.querySelector('.login-icon');
            if (mainIcon) {
                mainIcon.classList.add('icon-shake-anim');
                setTimeout(() => mainIcon.classList.remove('icon-shake-anim'), 400);
            }
        }
    } catch (error) {
        showNotice("Błąd bazy PIN!", "danger");
        btn.disabled = false;
        btn.innerHTML = 'Zaloguj <i class="fas fa-lock"></i>';
    }
}

// ==========================================
// FUNKCJE SYSTEMU SZYBKIEGO LOGOWANIA
// ==========================================
window.renderSavedProfiles = function() {
    const container = document.getElementById('saved-profiles-container');
    if (!container) return;
    const profiles = JSON.parse(localStorage.getItem('elcartel_gold_profiles') || '[]');
    
    if (profiles.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';

    profiles.forEach((p, index) => {
        const avatarHtml = p.photo && p.photo !== "" 
            ? `<img src="${p.photo}" class="saved-profile-avatar" alt="${p.name}">` 
            : `<div class="saved-profile-avatar" style="display:flex; justify-content:center; align-items:center; font-size:1.5rem; color:var(--text-secondary);"><i class="fas fa-user-tie"></i></div>`;
        
        html += `
            <div class="saved-profile-card" onclick="quickLogin('${p.pin}')">
                ${avatarHtml}
                <span class="saved-profile-name">${p.name}</span>
                <button class="remove-profile-btn" onclick="removeSavedProfile(${index}, event)" title="Usuń zapisany profil"><i class="fas fa-times"></i></button>
                
                <div class="profile-mini-stats">
                    <div class="stats-header">Zapisany profil</div>
                    <div class="stats-row">
                        <span><i class="fas fa-star text-secondary"></i> Stopień:</span>
                        <strong style="color: var(--accent-color); font-weight: 800;">${p.rank || 'Pracownik'}</strong>
                    </div>
                    <div class="stats-row">
                        <span><i class="fas fa-hashtag text-secondary"></i> SSN:</span>
                        <strong class="text-white-inline">${p.ssn || '---'}</strong>
                    </div>
                    <div class="stats-row">
                        <span><i class="fas fa-calendar-alt text-secondary"></i> Zatrudnienie:</span>
                        <strong class="text-white-inline" style="font-size: 0.75rem;">${p.dateZatrudnienia || 'Brak danych'}</strong>
                    </div>
                    <div class="stats-hint">Kliknij, aby zalogować</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.quickLogin = function(pin) {
    const pinInput = document.getElementById('employee-login-pin');
    if (pinInput) {
        pinInput.value = pin;
        window.login(); 
    }
}

window.removeSavedProfile = function(index, event) {
    event.stopPropagation(); 
    let profiles = JSON.parse(localStorage.getItem('elcartel_gold_profiles') || '[]');
    profiles.splice(index, 1);
    localStorage.setItem('elcartel_gold_profiles', JSON.stringify(profiles));
    renderSavedProfiles();
    if (typeof showNotice === 'function') {
        showNotice("Usunięto zapisany profil.", "info");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderSavedProfiles === 'function') renderSavedProfiles();
});

// ==========================================
// KOREKTA ZALEGŁEGO MAGAZYNU (MODAL)
// ==========================================
window.openKorektaModal = function() {
    document.getElementById('korekta-modal').classList.add('active');
}

window.closeKorektaModal = function() {
    document.getElementById('korekta-modal').classList.remove('active');
    document.getElementById('korekta-qty').value = "";
}

window.submitKorekta = async function(isAdding) {
    if (!isBoss) return;
    
    const itemName = document.getElementById('korekta-item').value;
    const qty = parseInt(document.getElementById('korekta-qty').value);
    const btnAdd = document.getElementById('korekta-btn-add');
    const btnSub = document.getElementById('korekta-btn-sub');

    if (!qty || qty <= 0) return showNotice("Wprowadź poprawną ilość!", "warning");

    btnAdd.disabled = true;
    btnSub.disabled = true;
    
    const prefix = isAdding ? "KOREKTA DODATNIA | " : "KOREKTA UJEMNA | ";

    const payload = {
        action: "save_receipt",
        type: "zloto", 
        employee: currentEmployeeName + " (Zarząd)",
        date: new Date().toLocaleString('pl-PL'),
        report_id: "KOREKTA-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        items: prefix + itemName + " x" + qty,
        total: 0, 
        revenue: 0,
        npc_alt: 0
    };

    document.getElementById('wh-count-0').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('wh-count-1').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('wh-count-2').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await fetch(REPORTS_API_URL, { 
            method: "POST", 
            body: JSON.stringify(payload) 
        });
        
        // DODANIE LOGU
        window.addSystemLog('KOREKTA MAGAZYNU', `Zastosowano korektę w odlewni. Akcja: ${isAdding ? 'DODATNIA (+)' : 'UJEMNA (-)'}, Przedmiot: ${itemName}, Ilość: ${qty} szt.`);

        showNotice("Pomyślnie zaktualizowano magazyn!", "success");
        closeKorektaModal();
        
        await loadWarehouseData(); 
    } catch (e) {
        showNotice("Błąd zapisu do bazy!", "danger");
        console.error(e);
    } finally {
        btnAdd.disabled = false;
        btnSub.disabled = false;
    }
}

// ==========================================
// GLOBALNE ODŚWIEŻANIE (MAGAZYN + STATYSTYKI)
// ==========================================
window.refreshAllData = async function() {
    const icon = document.getElementById('global-refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    
    document.getElementById('wh-count-0').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('wh-count-1').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('wh-count-2').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    await loadWarehouseData();
    if (isBoss) {
        await loadGoldStats();
    }
    
    if (icon) icon.classList.remove('fa-spin');
    showNotice("Dane odświeżone pomyślnie!", "success");
}

// ==========================================
// WIRTUALNY MAGAZYN - LOGIKA OBLICZEŃ
// ==========================================
window.loadWarehouseData = async function() {
    const whPanel = document.getElementById('warehouse-panel');
    if (whPanel) whPanel.style.display = 'block';

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();

        let stock = [0, 0, 0]; 

        data.forEach(row => {
            if (row.type === "skup" || row.type === "sprzedaz") {
                goldInventory.forEach((item, idx) => {
                    if (row.name === item.name) {
                        const qty = parseInt(row.qty) || 0;
                        if (row.type === "skup") stock[idx] += qty;
                        if (row.type === "sprzedaz") stock[idx] -= qty;
                    }
                });
            } 
            else if (row.type === "zloto") {
                goldInventory.forEach((item, idx) => {
                    const itemsStr = String(row.items || "");
                    const regex = new RegExp(item.name + "\\s*x(\\d+)", "i");
                    const match = itemsStr.match(regex);
                    if (match && match[1]) {
                        const parsedQty = parseInt(match[1]);
                        
                        if (itemsStr.includes("KOREKTA DODATNIA")) {
                            stock[idx] += parsedQty;
                        } else if (itemsStr.includes("KOREKTA UJEMNA")) {
                            stock[idx] -= parsedQty;
                        } else {
                            stock[idx] -= parsedQty; 
                        }
                    }
                });
            }
        });

        document.getElementById('wh-count-0').innerText = stock[0] + " szt.";
        document.getElementById('wh-count-1').innerText = stock[1] + " szt.";
        document.getElementById('wh-count-2').innerText = stock[2] + " szt.";

        let possibleBars = Math.floor(Math.min(
            stock[0] / goldInventory[0].reqPerBar,
            stock[1] / goldInventory[1].reqPerBar,
            stock[2] / goldInventory[2].reqPerBar
        ));
        
        possibleBars = Math.max(0, possibleBars);

        const possibleBarsEl = document.getElementById('wh-possible-bars');
        possibleBarsEl.innerText = possibleBars + " szt.";
        
        if(possibleBars > 0) {
            possibleBarsEl.style.color = "var(--success)";
        } else {
            possibleBarsEl.style.color = "var(--text-secondary)";
        }

    } catch (e) {
        console.error("Błąd ładowania magazynu:", e);
        document.getElementById('wh-possible-bars').innerText = "Błąd";
    }
}

function renderGoldItems() {
    const container = document.getElementById('gold-items-list');
    container.innerHTML = goldInventory.map((item, index) => {
        currentCounts[index] = 0;
        return `
            <div class="gold-item-card">
                <div class="gold-item-info">
                    <span class="gold-name">${item.name}</span>
                    <span class="gold-sub">Skup: ${item.price}$ | Receptura: ${item.reqPerBar} szt.</span>
                </div>
                <div class="gold-controls">
                    <button class="gold-btn minus" onclick="updateCount(${index}, -1)"><i class="fas fa-minus"></i></button>
                    <input type="number" id="count-${index}" class="gold-input" value="0" min="0" oninput="handleInput(${index}, this.value)">
                    <button class="gold-btn plus" onclick="updateCount(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.updateCount = function(i, change) {
    currentCounts[i] = Math.max(0, currentCounts[i] + change);
    document.getElementById(`count-${i}`).value = currentCounts[i];
    calculateZloto();
    window.triggerPulseEffect('total-cost', null);
}

window.handleInput = function(i, val) {
    currentCounts[i] = Math.max(0, parseInt(val) || 0);
    calculateZloto();
    window.triggerPulseEffect('total-cost', null);
}

function calculateZloto() {
    let totalSpent = 0;
    let earrings = currentCounts[0] || 0;
    let bracelets = currentCounts[1] || 0;
    let coins = currentCounts[2] || 0;

    totalSpent += earrings * goldInventory[0].price;
    totalSpent += bracelets * goldInventory[1].price;
    totalSpent += coins * goldInventory[2].price;

    let possibleBars = Math.floor(Math.min(
        earrings / goldInventory[0].reqPerBar,
        bracelets / goldInventory[1].reqPerBar,
        coins / goldInventory[2].reqPerBar
    ));

    let barValue = possibleBars * PRICE_PER_GOLD_BAR;
    let pureProfit = barValue - totalSpent;

    const totalCostEl = document.getElementById('total-cost');
    if(totalCostEl) {
        window.animateValue(totalCostEl, previousTotalCost, totalSpent, 400);
        previousTotalCost = totalSpent;
    }

    document.getElementById('possible-bars').innerText = possibleBars + ' szt.';
    document.getElementById('gold-bar-value').innerText = barValue + '$';

    const pureEl = document.getElementById('pure-profit');
    if(pureEl) {
        pureEl.innerText = (pureProfit >= 0 ? '+' : '') + pureProfit + '$';
        pureEl.style.color = pureProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

async function processSmelting() {
    const totalSpent = parseInt(document.getElementById('total-cost').innerText);
    const possibleBars = parseInt(document.getElementById('possible-bars').innerText);
    const barValue = parseInt(document.getElementById('gold-bar-value').innerText);
    
    if (totalSpent === 0) return showNotice("Piec jest pusty!", "warning");
    if (possibleBars === 0) return showNotice("Za mało materiałów na sztabkę!", "danger");

    const btn = document.getElementById('process-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressBox = document.getElementById('smelting-progress-box');
    const statusText = document.getElementById('smelting-status-text');
    const barFill = document.getElementById('smelting-bar-fill');
    const resultCard = document.getElementById('result-card');

    btn.style.display = 'none';
    resetBtn.style.display = 'none';
    progressBox.style.display = 'block';
    resultCard.classList.add('smelting-active'); 

    const stages = [
        { text: "Rozgrzewanie pieca...", width: "20%", time: 800 },
        { text: "Topienie kruszcu...", width: "50%", time: 1000 },
        { text: "Oddzielanie zanieczyszczeń...", width: "75%", time: 900 },
        { text: "Odlewanie i chłodzenie sztabek...", width: "100%", time: 800 }
    ];

    for (const stage of stages) {
        statusText.innerText = stage.text;
        barFill.style.width = stage.width;
        await delay(stage.time);
    }

    statusText.innerText = "Zapisywanie operacji...";

    const itemsToLog = [];
    goldInventory.forEach((item, i) => {
        if (currentCounts[i] > 0) {
            itemsToLog.push(`${item.name} x${currentCounts[i]}`);
        }
    });

    const payload = {
        action: "save_receipt",
        type: "zloto", 
        employee: currentEmployeeName,
        date: new Date().toLocaleString('pl-PL'),
        report_id: "GOLD-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        items: itemsToLog.join(", ") + ` => Sztabka Złota x${possibleBars}`,
        total: totalSpent,
        revenue: barValue,
        npc_alt: 0
    };

    try {
        // PANCERNY UKŁAD 2-KOLUMNOWY DLA ZŁOTA
        const zysk = payload.revenue - payload.total;
        const profitText = zysk >= 0 ? `+${zysk}$` : `${zysk}$`;

        const embedFields = [
            { 
                name: "Dane operacji", 
                value: `**👤 Pracownik:**\n\`${currentEmployeeName}\`\n\n**📦 Przetopiono:**\n\`${payload.items}\``, 
                inline: true 
            },
            { 
                name: "Rozliczenie finansowe", 
                value: `**📉 Koszt materiałów:**\n**${payload.total}$**\n\n**📈 Wartość sztabek:**\n**${payload.revenue}$**\n\n**💰 Zysk na czysto:**\n**${profitText}**`, 
                inline: true 
            }
        ];

        const discordPayload = {
            username: currentEmployeeName || "Pracownik",
            embeds: [{
                title: "🔥 NOWY WYTOP ZŁOTA",
                color: 15571200,
                fields: embedFields,
                timestamp: new Date().toISOString(),
                footer: { text: "System EL CARTEL ODLEWNIA" }
            }]
        };

        // Wyciąganie zdjęcia pracownika z pamięci przeglądarki (żeby awatar działał tak jak w kasie)
        try {
            const profiles = JSON.parse(localStorage.getItem('elcartel_gold_profiles') || '[]');
            const currentProfile = profiles.find(p => p.name === currentEmployeeName);
            if (currentProfile && currentProfile.photo && currentProfile.photo.trim() !== "") {
                discordPayload.avatar_url = currentProfile.photo;
            }
        } catch (e) {}
        
        const formData = new FormData();
        formData.append("payload_json", JSON.stringify(discordPayload));

        await fetch(DISCORD_WEBHOOK_URL, { 
            method: "POST", 
            body: formData 
        }).catch(e => console.error("Discord Error:", e));

        await fetch(REPORTS_API_URL, { 
            method: "POST", 
            body: JSON.stringify(payload) 
        }).catch(e => console.error("Google Sheets Error:", e));

        // DODANIE LOGU
        window.addSystemLog('PRZETOP ZŁOTA', `Przetopiono surowce na sztabki złota (x${possibleBars}). Wartość: ${barValue}$`);

        showNotice("Przetopiono pomyślnie! Logi wysłane.", "success");
        resetSmeltery();

        if (isBoss) {
            document.getElementById('wh-count-0').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            document.getElementById('wh-count-1').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            document.getElementById('wh-count-2').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await loadWarehouseData();
            loadGoldStats();
        }

    } catch (e) {
        showNotice("Wystąpił nieoczekiwany błąd zapisu!", "danger");
        console.error(e);
    } finally {
        progressBox.style.display = 'none';
        barFill.style.width = "0%";
        btn.style.display = 'block';
        resetBtn.style.display = 'block';
        resultCard.classList.remove('smelting-active');
    }
}

function resetSmeltery() {
    goldInventory.forEach((_, i) => {
        currentCounts[i] = 0;
        document.getElementById(`count-${i}`).value = 0;
    });
    calculateZloto();
}

// ==========================================
// FUNKCJE STATYSTYK ZŁOTA (TYLKO DLA SZEFA)
// ==========================================
window.loadGoldStats = async function() {
    if (!isBoss) return; 

    const tbody = document.getElementById('gold-logs-body');
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #666;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych z bazy...</td></tr>';
    
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        
        const goldData = data.filter(row => row.type === "zloto" && !String(row.items || "").includes("KOREKTA"));

        if (goldData.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">Brak zarejestrowanych przetopów w bazie danych.</td></tr>';
            return;
        }

        let spent = 0;
        let revenue = 0;

        if (tbody) {
            tbody.innerHTML = goldData.reverse().map(row => {
                const itemSpent = parseFloat(row.total) || 0;
                const itemRev = parseFloat(row.revenue) || 0;
                spent += itemSpent;
                revenue += itemRev;
                
                let dateDisplay = row.date;
                if(String(dateDisplay).includes('T')) {
                    dateDisplay = new Date(dateDisplay).toLocaleString('pl-PL');
                }

                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 15px; font-size: 0.85rem; color: #94a3b8;">${dateDisplay}</td>
                        <td style="padding: 15px; font-weight: 700; color: #fff;">${row.employee}</td>
                        <td style="padding: 15px; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4;">${row.items}</td>
                        <td style="padding: 15px; text-align: right; color: var(--danger); font-weight: 600;">-${itemSpent}$</td>
                        <td style="padding: 15px; text-align: right; color: var(--accent-color); font-weight: 800;">+${itemRev}$</td>
                    </tr>
                `;
            }).join('');
        }

        const totalSpentEl = document.getElementById('stat-total-spent');
        if (totalSpentEl) totalSpentEl.innerText = spent + '$';

        const totalRevEl = document.getElementById('stat-total-revenue');
        if (totalRevEl) totalRevEl.innerText = revenue + '$';
        
        const profit = revenue - spent;
        const profitEl = document.getElementById('stat-total-profit');
        if (profitEl) {
            profitEl.innerText = (profit >= 0 ? '+' : '') + profit + '$';
            profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
        }

    } catch (e) {
        console.error("Błąd ładowania statystyk:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--danger);">Błąd połączenia z bazą. Spróbuj odświeżyć ponownie.</td></tr>';
    }
}

function logout() {
    window.addSystemLog('WYLOGOWANIE', `Wylogowano z panelu odlewni.`);
    
    const mainApp = document.getElementById('main-app');
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const mainIcon = document.querySelector('.login-icon');

    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('user-profile').style.display = 'none';

    mainApp.classList.add('app-zoom-in');

    setTimeout(() => {
        mainApp.style.display = 'none';
        
        loginScreen.classList.add('active');
        loginCard.classList.add('login-zoom-out');

        // Zostawiamy otwartą kłódkę na czas wjazdu karty
        if (mainIcon) {
            mainIcon.className = 'fas fa-unlock login-icon';
            
            // Wydłużone opóźnienie: czeka aż karta w pełni wyląduje (550ms)
            setTimeout(() => {
                mainIcon.className = 'fas fa-lock login-icon icon-lock-anim';
            }, 550);
        }

        // Wydłużemy czas do restartu strony (550ms czekania + 500ms animacji = ok. 1200ms całkowitego czasu)
        setTimeout(() => {
            location.reload();
        }, 1200);
    }, 400);
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = msg; 
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; setTimeout(() => t.remove(), 500); }, 3000);
}

// ==========================================
// SYSTEM AUTOMATYCZNEJ AKTUALIZACJI STRONY
// ==========================================
async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        console.log(`[SYSTEM] Wersja lokalna: ${APP_VERSION} | Wersja na serwerze: ${serverVersion}`);
        
        if (serverVersion !== APP_VERSION) {
            if (localStorage.getItem('update_ignored_version') === serverVersion) {
                return;
            }
            showUpdatePrompt(serverVersion);
        }
    } catch (e) {
        // Ciche ignorowanie błędu
    }
}

function showUpdatePrompt(serverVersion) {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt';
    div.className = 'update-notify';
    div.innerHTML = `
        <span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję systemu!</span>
        <button class="update-btn-refresh" onclick="forceHardReload('${serverVersion}')">Odśwież</button>
    `;
    document.body.appendChild(div);
}

window.forceHardReload = async function(serverVersion) {
    console.log("[SYSTEM] Inicjowanie twardego przeładowania...");
    
    if (serverVersion) {
        localStorage.setItem('update_ignored_version', serverVersion);
    }
    
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
            await reg.unregister();
        }
    }
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (let name of cacheNames) {
            await caches.delete(name);
        }
    }
    window.location.href = window.location.pathname + '?refresh=' + new Date().getTime();
};

setInterval(checkUpdates, 60000);
setTimeout(checkUpdates, 3000);

// ==========================================
// AUTOMATYCZNE WYLOGOWANIE PRZY ZAMKNIĘCIU OKNA/KARTY
// ==========================================
window.addEventListener('beforeunload', function() {
    if (currentEmployeeName) {
        fetch(REPORTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // <--- DODANY NAGŁÓWEK
            keepalive: true,
            body: JSON.stringify({
                action: 'save_log',
                date: getFormattedDateTime(), // <--- DODANY LOKALNY CZAS
                employee: currentEmployeeName,
                type: 'WYLOGOWANIE',
                description: 'Zamknięto kartę lub okno panelu odlewni (automatyczne wylogowanie).'
            })
        });
    }
});