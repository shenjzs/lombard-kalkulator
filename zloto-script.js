const APP_VERSION = "4.6.9";

// ==========================================
// KONFIGURACJA
// ==========================================
const ALLOWED_DISCORD_ROLES = ["1518034726512885851"];
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
let currentEmployeeAvatar = ""; // Dodane na wzór głównego skryptu
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_log',
                date: typeof getFormattedDateTime === 'function' ? getFormattedDateTime() : new Date().toLocaleString('pl-PL'),
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

// Nasłuchiwanie scrolla, żeby zwinąć pasek w ikonki
document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// SYSTEM LOGOWANIA DISCORD OAUTH2 + KARTOTEKA IC + LIVE ROLE CHECK
// ==========================================
window.login = function() {
    const btn = document.getElementById('login-btn-action') || document.getElementById('login-btn');
    const originalBtnContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oczekiwanie na Discord...';

    const authUrl = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/auth/login";
    const width = 500;
    const height = 750;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const popup = window.open(authUrl, 'DiscordLogin', `width=${width},height=${height},top=${top},left=${left}`);

    const checkPopup = setInterval(() => {
        if (!popup || popup.closed || popup.closed === undefined) {
            clearInterval(checkPopup);
            if (btn.disabled) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                showNotice("Anulowano logowanie przez Discord.", "warning");
            }
        }
    }, 1000);

    const messageListener = function(event) {
        if (event.origin !== "https://elcartel-wbhk.bcjds9j7ht.workers.dev") return;

        if (event.data && event.data.type === "DISCORD_LOGIN_SUCCESS") {
            window.removeEventListener('message', messageListener);
            clearInterval(checkPopup);

            const userData = event.data.user;

            // --- ZAPAMIĘTYWANIE SESJI DISCORD (NA 12 GODZIN) ---
            const rememberCheckbox = document.getElementById('remember-discord-checkbox');
            if (rememberCheckbox && rememberCheckbox.checked) {
                const sessionData = {
                    user: userData,
                    timestamp: Date.now()
                };
                localStorage.setItem('elcartel_gold_discord_session', JSON.stringify(sessionData));
            }
            // -------------------------------------

            window.executeLoginSequence(userData, btn, originalBtnContent);
        }
    };

    window.addEventListener('message', messageListener);
};

window.executeLoginSequence = async function(userData, btnElement, originalBtnContent) {
    // --- ZABEZPIECZENIE PRZED PODWÓJNYM LOGOWANIEM ---
    if (window.isLoginInProgress) return;
    window.isLoginInProgress = true;

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja rangi...';
    }

    try {
        // 1. Sprawdzanie ról z serwera Discord
        const roleRes = await fetch(`${REPORTS_API_URL}?action=check_access&discord_id=${userData.id}`);
        const roleData = await roleRes.json();
        
        // Sprawdza, czy gracz ma przynajmniej jedno ID z naszej listy dozwolonych
        const hasAccess = roleData.roles && roleData.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));
        
        if (!hasAccess) {
            showNotice("Odmowa dostępu! Brak przypisanej rangi.", "danger");
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = originalBtnContent || `<i class="fab fa-discord"></i> Zaloguj przez Discord`;
            }
            localStorage.removeItem('elcartel_gold_discord_session'); 
            window.isLoginInProgress = false; // Odblokowanie
            return;
        }

        // 2. Jeśli ma rolę, pobieramy kartotekę IC
        if (btnElement) btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pobieranie kartoteki...';

        const res = await fetch(`${REPORTS_API_URL}?action=get_employee&discord_id=${userData.id}`);
        const empData = await res.json();

        if (empData && empData.ic_name) {
            window.completeLoginFlow(userData, empData, btnElement, originalBtnContent);
        } else {
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = originalBtnContent;
            }
            document.getElementById('setup-avatar').value = userData.avatar || "";
            document.getElementById('first-login-modal').classList.add('active');
            window.tempDiscordUserData = userData; 
            window.isLoginInProgress = false; // Odblokowanie
        }
    } catch (e) {
        showNotice("Błąd połączenia z bazą Cartelu!", "danger");
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalBtnContent || `<i class="fab fa-discord"></i> Zaloguj przez Discord`;
        }
        window.isLoginInProgress = false; // Odblokowanie
    }
};

window.saveFirstSetup = async function() {
    const icName = document.getElementById('setup-ic-name').value.trim();
    const ssn = document.getElementById('setup-ssn').value.trim();
    const avatar = document.getElementById('setup-avatar').value.trim();

    if (!icName || !ssn) return showNotice("Wypełnij Imię, Nazwisko i SSN!", "warning");

    const btn = document.getElementById('save-setup-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_employee',
                discord_id: window.tempDiscordUserData.id,
                ic_name: icName,
                ssn: ssn,
                avatar_url: avatar || window.tempDiscordUserData.avatar,
                date: getFormattedDate()
            })
        });

        document.getElementById('first-login-modal').classList.remove('active');
        
        const newEmpData = {
            ic_name: icName,
            ssn: ssn,
            avatar_url: avatar || window.tempDiscordUserData.avatar,
            rank: "Pracownik",
            hire_date: getFormattedDate()
        };
        
        window.completeLoginFlow(window.tempDiscordUserData, newEmpData, null, null);
    } catch(e) {
        showNotice("Wystąpił błąd podczas zapisu!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

window.completeLoginFlow = function(userData, empData, btnElement, originalBtnContent) {
    const mainIcon = document.querySelector('.login-icon');
    
    // Budowanie pełnego adresu URL awatara - identycznie jak w script.js
    const discordAvatarUrl = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : "";
    const finalAvatarUrl = empData.avatar_url || discordAvatarUrl;

    if (mainIcon && finalAvatarUrl) {
        mainIcon.outerHTML = `<img src="${finalAvatarUrl}" class="login-icon icon-unlock-anim" style="border-radius: 50%; width: 70px; height: 70px; border: 3px solid #22c55e; margin: 0 auto 20px auto; display: block; background: #0f172a;">`;
    }

    setTimeout(() => {
        currentEmployeeName = empData.ic_name;
        currentEmployeeAvatar = finalAvatarUrl; // Zapisanie pełnego linku do zmiennej globalnej
        isBoss = true; 
        
        document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('user-profile').style.display = 'block';
        document.getElementById('header-date').innerText = getFormattedDate();
        
        window.addSystemLog('LOGOWANIE', `Zalogowano do panelu odlewni (Postać IC: ${currentEmployeeName}).`);

        renderGoldItems();
        loadWarehouseData();

        document.getElementById('boss-stats-section').style.display = 'block';
        document.getElementById('admin-tools-trigger').style.display = 'block';
        loadGoldStats(); 
        
        showNotice(`Witaj w odlewni, ${currentEmployeeName}!`, "success");
        
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalBtnContent || `<i class="fab fa-discord"></i> Zaloguj przez Discord`;
        }

        // --- LIVE ROLE CHECK (WYKOPANIE Z PANELU PO UTRACIE RANGI) ---
        if (window.accessCheckInterval) clearInterval(window.accessCheckInterval);
        window.accessCheckInterval = setInterval(async () => {
            try {
                const res = await fetch(`${REPORTS_API_URL}?action=check_access&discord_id=${userData.id}`);
                const data = await res.json();
                const hasAccess = data.roles && data.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));
                if (!hasAccess) {
                    clearInterval(window.accessCheckInterval);
                    showNotice("Utracono uprawnienia dostępu z poziomu serwera Discord!", "danger");
                    window.logout(); 
                }
            } catch(e) {}
        }, 60000); 
        // -------------------------------------------------------------

    }, 600);
};

window.checkSavedDiscordSession = function() {
    const saved = localStorage.getItem('elcartel_gold_discord_session');
    if (!saved) return;

    try {
        const sessionData = JSON.parse(saved);
        
        // Kompatybilność wsteczna ze starymi sesjami oraz nowymi (z czasem)
        const userData = sessionData.user ? sessionData.user : sessionData;
        const timestamp = sessionData.timestamp || 0;
        
        // Obliczamy 12 godzin w milisekundach (12h * 60m * 60s * 1000ms = 43200000)
        const TWELVE_HOURS = 43200000;
        
        if (timestamp > 0 && (Date.now() - timestamp > TWELVE_HOURS)) {
            console.log("[System] Zapisana sesja wygasła po 12h. Wymagane ponowne logowanie.");
            localStorage.removeItem('elcartel_gold_discord_session');
            return;
        }

        if (!userData || !userData.id) return;
        
        const btn = document.getElementById('login-btn-action');
        const originalHtml = btn ? btn.innerHTML : `<i class="fab fa-discord"></i> Zaloguj przez Discord`;

        window.executeLoginSequence(userData, btn, originalHtml);
    } catch (e) {
        console.error("Błąd odczytu sesji:", e);
        localStorage.removeItem('elcartel_gold_discord_session');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.checkSavedDiscordSession();
});

// ==========================================
// BEZPIECZNE WYLOGOWANIE Z SYSTEMU (ZŁOTO)
// ==========================================
window.logout = function() {
    window.isLoginInProgress = false; // Zdejmuje blokadę po wylogowaniu

    // --- CZYSZCZENIE TRWAŁEJ SESJI DISCORD ---
    localStorage.removeItem('elcartel_gold_discord_session');
    
    // --- LIVE ROLE CHECK - CZYSZCZENIE INTERWAŁU ---
    if (window.accessCheckInterval) clearInterval(window.accessCheckInterval);
    // -------------------------------------------------------------

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

        // Przywracamy kłódkę (zamiana z Avatara Discorda)
        if (mainIcon) {
            mainIcon.outerHTML = '<i class="fas fa-unlock login-icon"></i>';
            setTimeout(() => {
                const newIcon = document.querySelector('.login-icon');
                if (newIcon) {
                    newIcon.className = 'fas fa-lock login-icon icon-lock-anim';
                }
            }, 550);
        }

        setTimeout(() => {
            location.reload();
        }, 1200);
    }, 400);
};

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
        username: currentEmployeeName ? `${currentEmployeeName} | EL CARTEL` : "EL CARTEL SYSTEM",
        avatar_url: currentEmployeeAvatar || "", // Bezpośrednie użycie gotowego, pełnego linku
        embeds: [
            {
                title: "🔥 NOWY WYTOP ZŁOTA",
                color: 15571200,
                fields: embedFields,
                timestamp: new Date().toISOString(),
                footer: { text: "System EL CARTEL ODLEWNIA" }
            }]
        };

        // Wyciąganie zdjęcia i ID pracownika z aktywnej sesji Discord
        let discordId = "brak";
        try {
            const savedSession = JSON.parse(localStorage.getItem('elcartel_gold_discord_session') || '{}');
            const userData = savedSession.user ? savedSession.user : savedSession;
            
            if (userData && userData.avatar) {
                discordPayload.avatar_url = userData.avatar;
            }
            if (userData && userData.id) {
                discordId = userData.id;
            }
        } catch (e) {}
        
        const formData = new FormData();
        formData.append("payload_json", JSON.stringify(discordPayload));

        const webhookRes = await fetch(DISCORD_WEBHOOK_URL, { 
            method: "POST", 
            headers: { "X-Discord-ID": discordId },
            body: formData 
        });

        if (!webhookRes.ok) {
            const errorTxt = await webhookRes.text();
            showNotice("Blokada wysyłki: " + errorTxt, "danger");
            console.error("Szczegóły błędu:", errorTxt);
            return; // Zatrzymuje dalsze skrypty jeśli Discord zablokowany
        }

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
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
                action: 'save_log',
                date: typeof getFormattedDateTime === 'function' ? getFormattedDateTime() : new Date().toLocaleString('pl-PL'),
                employee: currentEmployeeName,
                type: 'WYLOGOWANIE',
                description: 'Zamknięto kartę lub okno panelu odlewni (automatyczne wylogowanie).'
            })
        });
    }
});