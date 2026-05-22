// ==========================================
// WERSJA APLIKACJI (Zmień, aby wymusić odświeżenie u wszystkich)
// ==========================================
const APP_VERSION = "3.4.0";

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500573620605550725/VmpdLB3qN1FT6Jkf-U-Wo1cig-WEpVjleki4f-EA45G5QfSuBJeC3f1fqCKB_LTeXOQ5"; 
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec"; 
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

const inventory = [
    { name: "Zdobiona książka", price: 150, category: "inne" },
    { name: "Dywan", price: 300, category: "dom" },
    { name: "Komputer (laptop)", price: 750, category: "elektronika" },
    { name: "Komputer (stacjonarny)", price: 850, category: "elektronika" },
    { name: "Konsola", price: 500, category: "elektronika" },
    { name: "Konsola DJ", price: 800, category: "elektronika" },
    { name: "Kobieca plastikowa figurka", price: 120, category: "inne" },
    { name: "Stara zapalniczka", price: 22, category: "inne" },
    { name: "Plastikowa figurka małpki", price: 100, category: "inne" },
    { name: "Kwiat", price: 80, category: "dom" },
    { name: "Gitara elektryczna", price: 600, category: "elektronika" },
    { name: "Dziwna substancja", price: 120, category: "inne" },
    { name: "Dziwna szara substancja", price: 200, category: "inne" },
    { name: "Biżuteria", price: 300, category: "biżuteria" },
    { name: "Brudna biżuteria", price: 180, category: "biżuteria" },
    { name: "Katana", price: 600, category: "inne" },
    { name: "Mikrofala", price: 350, category: "dom" },
    { name: "Mikser", price: 200, category: "dom" },
    { name: "Monitor", price: 180, category: "elektronika" },
    { name: "Obraz", price: 140, category: "dom" },
    { name: "Obraz ścienny", price: 220, category: "dom" },
    { name: "Głośnik", price: 180, category: "elektronika" },
    { name: "Telewizor", price: 750, category: "elektronika" },
    { name: "Zegarek", price: 200, category: "biżuteria" },
    { name: "Stary popsuty telefon", price: 110, category: "elektronika" },
	{ name: "Sztabka złota", price: 15000, category: "inne" },
    { name: "Złota moneta z prezydentem", price: 250, category: "inne" }
];

let counts = {};
let currentCategory = 'wszystkie';
let currentTotal = 0;
let lastGeneratedReportID = ""; 
let currentEmployeeName = ""; 
let currentCustomerSSN = ""; // Nowa zmienna na SSN

let myStatsRawData = [];
let currentStatsType = 'sprzedaz';
let currentStatsRange = 'today';

function getFormattedDate() {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

function getFormattedDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.includes("T")) {
        return new Date(dateStr); 
    }
    const parts = String(dateStr).split(" ");
    const dateParts = parts[0].split(".");
    if (dateParts.length !== 3) return new Date(dateStr);
    const d = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    if (parts[1]) {
        const timeParts = parts[1].split(":");
        d.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0, 0);
    } else {
        d.setHours(0, 0, 0, 0);
    }
    return d;
}

// NASŁUCHIWANIE SCROLLA DLA NAVBARA
document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// SYSTEM LOGOWANIA
// ==========================================
window.login = async function() {
    const pin = document.getElementById('employee-login-pin').value;
    const btn = document.getElementById('login-btn');
    if (!pin) return showNotice("Wprowadź PIN!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            currentEmployeeName = data.name;
            document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            showNotice(`Rozpoczęto zmianę: ${data.name}`, "success");
            init();
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (error) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Odblokuj system <i class="fas fa-unlock"></i>';
    }
}

window.logout = function() {
    currentEmployeeName = "";
    document.getElementById('employee-login-pin').value = "";
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('user-profile').classList.add('hidden');
    document.getElementById('user-dropdown').classList.remove('active');
    counts = {};
    inventory.forEach((_, index) => { counts[index] = 0; });
    document.querySelectorAll('.custom-item').forEach(el => el.remove());
    calculateTotal();
    showNotice("Zakończono zmianę. Wylogowano.", "info");
}

window.toggleUserMenu = function() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

// Zamykanie dropdowna kliknięciem poza nim
document.addEventListener('click', function(event) {
    const profile = document.getElementById('user-profile');
    const dropdown = document.getElementById('user-dropdown');
    if (profile && dropdown && !profile.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

function init() {
    const list = document.getElementById('items-list');
    if (!list) return;
    
    list.innerHTML = '';
    document.getElementById('header-date').innerText = getFormattedDate();
    
    inventory.forEach((item, index) => {
        if(counts[index] === undefined) counts[index] = 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        card.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">Sprzedaż: ${item.price}$</span>
            </div>
            <div class="controls">
                <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                <input type="number" id="count-${index}" class="quantity-input" value="0" min="0" oninput="handleInput(${index}, this.value)">
                <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
            </div>
        `;
        list.appendChild(card);
    });
    
    updateCartView();
}

window.addCustomItemSlot = function() {
    const list = document.getElementById('items-list');
    const index = inventory.length; 
    
    inventory.push({ name: "Własny przedmiot", price: 0, category: "custom", isCustom: true });
    counts[index] = 1;

    const card = document.createElement('div');
    card.className = 'item-card custom-item';
    card.setAttribute('data-category', 'custom');
    card.id = `custom-card-${index}`;
    
    card.innerHTML = `
        <div class="custom-inputs-wrapper">
            <input type="text" class="custom-name-input" placeholder="Wpisz nazwę..." oninput="updateCustomName(${index}, this.value)">
            <input type="number" class="custom-price-input" placeholder="Cena $" min="0" oninput="updateCustomPrice(${index}, this.value)">
        </div>
        <div class="controls">
            <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
            <input type="number" id="count-${index}" class="quantity-input" value="1" min="0" oninput="handleInput(${index}, this.value)">
            <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
        </div>
    `;
    
    list.insertBefore(card, list.firstChild);
    calculateTotal();
}

window.updateCustomName = function(i, val) {
    inventory[i].name = val || "Własny przedmiot";
    updateCartView();
}

window.updateCustomPrice = function(i, val) {
    inventory[i].price = parseInt(val) || 0;
    calculateTotal();
}

window.updateCount = function(i, change) {
    counts[i] = Math.max(0, (counts[i] || 0) + change);
    const input = document.getElementById(`count-${i}`);
    if (input) input.value = counts[i];
    calculateTotal();
}

window.handleInput = function(i, value) {
    counts[i] = Math.max(0, parseInt(value) || 0);
    calculateTotal();
}

function calculateTotal() {
    currentTotal = inventory.reduce((sum, item, i) => sum + (item.price * (counts[i] || 0)), 0);
    const totalDisplay = document.getElementById('total-price');
    if (totalDisplay) totalDisplay.innerText = currentTotal + '$';
    
    updateCartView();
}

window.toggleCart = function() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

window.updateCartView = function() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge');
    const sidebarTotal = document.getElementById('cart-sidebar-total');
    
    let totalItems = 0;
    let html = '';

    inventory.forEach((item, index) => {
        if (counts[index] > 0) {
            totalItems += counts[index];
            let itemTotal = item.price * counts[index];
            let displayName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-info-col">
                        <span class="cart-item-name">${displayName}</span>
                        <div class="cart-controls">
                            <button class="cart-btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                            <span class="cart-item-qty">${counts[index]}</span>
                            <button class="cart-btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${itemTotal}$</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) {
        html = '<div class="empty-cart-msg">Brak dodanych przedmiotów</div>';
    }

    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentTotal + '$';
};

window.filterCategory = function(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.item-card:not(.custom-item)').forEach(card => {
        const match = card.getAttribute('data-name').includes(term) && 
                      (currentCategory === 'wszystkie' || card.getAttribute('data-category') === currentCategory);
        card.classList.toggle('hidden', !match);
    });
}

// LOGIKA
window.generateQuote = async function() {
    if (!Object.values(counts).some(c => c > 0)) return showNotice("Koszyk jest pusty!", "warning");
    
    const ssnInput = document.getElementById('customer-ssn-input');
    currentCustomerSSN = ssnInput ? ssnInput.value.trim() : "";

    const btn = document.getElementById('quote-btn');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie...';

    setTimeout(() => {
        finalizeQuote(currentEmployeeName);
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }, 400);
}

window.finalizeQuote = function(employeeName) {
    lastGeneratedReportID = `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = getFormattedDate();
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSN !== "") {
        employeeText += `<br>KLIENT (SSN): ${currentCustomerSSN}`;
    }

    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>EL CARTEL EXPORT</h2>
                <p class="receipt-meta">Raport sprzedaży przedmiotów</p>
                <p class="receipt-meta">NR: ${lastGeneratedReportID}</p>
                <p class="receipt-meta">${employeeText}</p>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items-list">
                ${inventory.map((item, i) => {
                    if (counts[i] > 0) {
                        let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
                        return `
                        <div class="receipt-row">
                            <span>${dName} x${counts[i]}</span>
                            <span>${item.price * counts[i]}$</span>
                        </div>
                        `;
                    }
                    return '';
                }).join('')}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-row total">
                <span>RAZEM:</span>
                <span>${currentTotal}$</span>
            </div>
            <p class="receipt-meta" style="margin-top: 15px;">Data wystawienia: ${date}</p>
            <div class="receipt-stamp">SPRZEDANO</div>
        </div>
    `;

    const preview = document.getElementById('receipt-preview-container');
    const capture = document.getElementById('receipt-capture-area');

    if (preview && capture) {
        preview.innerHTML = receiptHTML;
        capture.innerHTML = receiptHTML;
        document.getElementById('quote-modal').classList.add('active');
    }
}

async function sendToDiscord() {
    const btn = document.getElementById('send-discord-btn');
    const area = document.getElementById('receipt-capture-area');
    
    if (!area) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PRZETWARZANIE...';

    const itemsToLog = [];
    inventory.forEach((item, i) => {
        if (counts[i] > 0) {
            let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            itemsToLog.push({
                name: dName,
                qty: counts[i],
                total: item.price * counts[i]
            });
        }
    });

    const logPayload = {
        action: "save_receipt",
        type: "sprzedaz", 
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: lastGeneratedReportID,
        items: itemsToLog
    };

    try {
        const canvas = await html2canvas(area, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "raport.png");
            
            let employeeFieldValue = `\`${currentEmployeeName}\``;
            if (currentCustomerSSN !== "") {
                employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSN}**)`;
            }

            const embedPayload = {
                embeds: [{
                    title: "🚛 NOWY RAPORT SPRZEDAŻY",
                    color: 15995922,
                    fields: [
                        { name: "👤 Pracownik:", value: employeeFieldValue, inline: true },
                        { name: "📋 Nr raportu:", value: `\`${lastGeneratedReportID}\``, inline: true },
                        { name: "💰 Suma:", value: `\`${currentTotal}$\``, inline: false }
                    ],
                    image: { url: "attachment://raport.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System EL CARTEL PAWN SHOP" }
                }]
            };

            formData.append("payload_json", JSON.stringify(embedPayload));

            const res = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", body: formData });
            if (res.ok) {
                fetch(REPORTS_API_URL, {
                    method: "POST",
                    body: JSON.stringify(logPayload)
                }).catch(e => console.error("Błąd zapisu w arkuszu:", e));

                showNotice("Wysłano na Discord!", "success");
                closeModal();
                
                Object.keys(counts).forEach(i => {
                    counts[i] = 0;
                    const inp = document.getElementById(`count-${i}`);
                    if (inp) inp.value = 0;
                });
                document.querySelectorAll('.custom-item').forEach(el => el.remove());
                
                const ssnInput = document.getElementById('customer-ssn-input');
                if (ssnInput) ssnInput.value = "";
                currentCustomerSSN = "";

                calculateTotal();

            } else {
                showNotice("Błąd Webhooka!", "danger");
            }
        }, "image/png");
    } catch (e) {
        showNotice("Błąd generatora!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij raport na Discord';
    }
}

window.closeModal = () => document.getElementById('quote-modal').classList.remove('active');

function showNotice(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

window.toggleSummary = function() {
    const bar = document.getElementById('summary-bar');
    const icon = document.getElementById('toggle-icon');
    if (bar && icon) {
        bar.classList.toggle('open');
        if (bar.classList.contains('open')) {
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        } else {
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    const sendBtn = document.getElementById('send-discord-btn');
    if (sendBtn) sendBtn.onclick = sendToDiscord;
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            Object.keys(counts).forEach(i => {
                counts[i] = 0;
                const inp = document.getElementById(`count-${i}`);
                if (inp) inp.value = 0;
            });
            document.querySelectorAll('.custom-item').forEach(el => el.remove());
            
            const ssnInput = document.getElementById('customer-ssn-input');
            if (ssnInput) ssnInput.value = "";
            currentCustomerSSN = "";

            calculateTotal();
            showNotice("Wyczyszczono listę!", "warning");
        };
    }
    
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) {
        loginPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
});

// ==========================================
// SYSTEM AUTOMATYCZNEJ AKTUALIZACJI STRONY
// ==========================================
async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        if (serverVersion !== APP_VERSION) {
            showUpdatePrompt();
        }
    } catch (e) {}
}

function showUpdatePrompt() {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt';
    div.className = 'update-notify';
    div.innerHTML = `
        <span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję systemu!</span>
        <button class="update-btn-refresh" onclick="forceHardReload()">Odśwież</button>
    `;
    document.body.appendChild(div);
}

window.forceHardReload = async function() {
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
// SYSTEM USTAWIEŃ (ZMIANA PIN)
// ==========================================
window.openSettings = function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('settings-modal').classList.add('active');
}

window.closeSettings = function() {
    document.getElementById('settings-modal').classList.remove('active');
    document.getElementById('old-pin-input').value = '';
    document.getElementById('new-pin-input').value = '';
    document.getElementById('new-pin-confirm').value = '';
}

window.changeEmployeePin = async function() {
    const oldPin = document.getElementById('old-pin-input').value;
    const newPin = document.getElementById('new-pin-input').value;
    const confirmPin = document.getElementById('new-pin-confirm').value;

    if (!oldPin || !newPin || !confirmPin) {
        return showNotice("Wypełnij wszystkie pola!", "warning");
    }
    if (newPin !== confirmPin) {
        return showNotice("Nowe kody PIN nie są identyczne!", "danger");
    }
    if (newPin.length < 4) {
        return showNotice("Nowy PIN musi mieć dokładnie 4 cyfry!", "warning");
    }
    if (oldPin === newPin) {
        return showNotice("Nowy PIN musi różnić się od starego!", "warning");
    }

    const btn = document.getElementById('change-pin-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        const response = await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'change_pin',
                old_pin: oldPin,
                new_pin: newPin,
                name: currentEmployeeName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotice("Twój PIN został pomyślnie zmieniony!", "success");
            closeSettings();
        } else {
            showNotice(data.message || "Błąd zmiany PINu! Prawdopodobnie wpisałeś zły obecny PIN.", "danger");
        }
    } catch (e) {
        showNotice("Błąd połączenia z bazą danych!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ==========================================
// SYSTEM STATYSTYK PRACOWNIKA (MODAL)
// ==========================================
window.openMyStats = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-stats-modal').classList.add('active');
    
    document.getElementById('my-stats-loader').classList.remove('hidden');
    document.getElementById('my-stats-content').classList.add('hidden');
    
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        
        // Zapisujemy wszystkie dane przypisane do pracownika
        myStatsRawData = rawData.filter(row => row.employee === currentEmployeeName);
        
        document.getElementById('my-stats-time-filter').value = 'today';
        currentStatsType = 'sprzedaz';
        currentStatsRange = 'today';
        
        document.getElementById('btn-stats-sprzedaz').classList.add('active');
        document.getElementById('btn-stats-skup').classList.remove('active');

        renderMyStatsDisplay();
        
        document.getElementById('my-stats-loader').classList.add('hidden');
        document.getElementById('my-stats-content').classList.remove('hidden');
        
    } catch (err) {
        console.error(err);
        document.getElementById('my-stats-loader').innerHTML = '<p style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchStatsView = function(type) {
    currentStatsType = type;
    document.getElementById('btn-stats-skup').classList.toggle('active', type === 'skup');
    document.getElementById('btn-stats-sprzedaz').classList.toggle('active', type === 'sprzedaz');
    renderMyStatsDisplay();
}

window.changeStatsTimeRange = function(range) {
    currentStatsRange = range;
    renderMyStatsDisplay();
}

window.renderMyStatsDisplay = function() {
    const typeData = myStatsRawData.filter(row => row.type === currentStatsType);
    
    let periodTotal = 0;
    let allTimeTotal = 0;
    let txSet = new Set();
    let itemCounts = {};
    let periodItemsQty = 0;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOf7Days = startOfToday - (6 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    typeData.forEach(row => {
        allTimeTotal += row.total; 
        
        let rowTime = 0;
        const d = parseDate(row.date);
        if(d) rowTime = d.getTime();

        let isInRange = false;
        
        if (currentStatsRange === 'all') {
            isInRange = true;
        } else if (currentStatsRange === 'today') {
            if (rowTime >= startOfToday) isInRange = true;
        } else if (currentStatsRange === 'yesterday') {
            if (rowTime >= startOfYesterday && rowTime < startOfToday) isInRange = true;
        } else if (currentStatsRange === '7days') {
            if (rowTime >= startOf7Days) isInRange = true;
        } else if (currentStatsRange === 'month') {
            if (rowTime >= startOfMonth) isInRange = true;
        }
        
        if (isInRange) {
            periodTotal += row.total;
            periodItemsQty += row.qty;
            if (row.report_id) txSet.add(row.report_id);
            if (!itemCounts[row.name]) itemCounts[row.name] = 0;
            itemCounts[row.name] += row.qty;
        }
    });

    let displayPeriodTotal = periodTotal;
    
    let topItem = "Brak";
    let maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
        if (qty > maxQty) {
            maxQty = qty;
            topItem = name;
        }
    }

    let txCount = txSet.size;
    if (txCount === 0 && displayPeriodTotal > 0) {
        txCount = Object.keys(itemCounts).length > 0 ? 1 : 0; 
    }

    let avgTx = txCount > 0 ? Math.round(displayPeriodTotal / txCount) : 0;
    
    document.getElementById('ms-today').innerText = displayPeriodTotal + '$';
    document.getElementById('ms-alltime').innerText = allTimeTotal + '$';
    document.getElementById('ms-count').innerText = txCount;
    document.getElementById('ms-avg').innerText = avgTx + '$';
    document.getElementById('ms-items').innerText = periodItemsQty;
    
    if (topItem.length > 15) topItem = topItem.substring(0, 15) + '...';
    document.getElementById('ms-topitem').innerText = topItem;

    const labelAction = currentStatsType === 'skup' ? 'Skupione' : 'Sprzedane';
    const labelEl = document.getElementById('ms-label-items');
    if(labelEl) labelEl.innerText = `${labelAction} sztuki`;
    
    const descEl = document.getElementById('my-stats-desc');
    if (descEl) {
        descEl.innerText = currentStatsType === 'skup' ? 'Podsumowanie Twojej aktywności w firmie (skup).' : 'Podsumowanie Twojej aktywności w firmie (sprzedaż).';
    }

    const periodLabelEl = document.getElementById('ms-label-period');
    if (periodLabelEl) {
        if (currentStatsRange === 'today') periodLabelEl.innerText = 'Dzisiejszy obrót';
        else if (currentStatsRange === 'yesterday') periodLabelEl.innerText = 'Wczorajszy obrót';
        else if (currentStatsRange === '7days') periodLabelEl.innerText = 'Obrót (7 dni)';
        else if (currentStatsRange === 'month') periodLabelEl.innerText = 'Obrót (Miesiąc)';
        else periodLabelEl.innerText = 'Obrót (Całkowity)';
    }
}

window.closeMyStats = function() {
    document.getElementById('my-stats-modal').classList.remove('active');
    document.getElementById('my-stats-loader').innerHTML = `
        <i class="fas fa-circle-notch fa-spin fa-3x" style="color: var(--accent-color);"></i>
        <p style="margin-top: 15px; color: var(--text-secondary); font-weight: 600;">Pobieranie danych z bazy...</p>
    `;
}