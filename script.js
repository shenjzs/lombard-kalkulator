// ==========================================
// WERSJA APLIKACJI
// ==========================================
const APP_VERSION = "3.7.3";
let LATEST_CHANGELOG_VERSION = APP_VERSION; 

// ==========================================
// KONFIGURACJA I API
// ==========================================
const DISCORD_WEBHOOK_URL_SKUP = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/skup"; 
const DISCORD_WEBHOOK_URL_EXPORT = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/export";

const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

// ==========================================
// ZMIENNE GLOBALNE (WSPÓLNE)
// ==========================================
let currentEmployeeName = ""; 
let currentEmployeeRank = "Pracownik"; 
let currentEmployeeSsn = "---"; 
let currentEmployeeDateZatrudnienia = "---"; 
let currentEmployeePhoto = ""; 
let currentActiveView = 'skup';

let myStatsRawData = [];
let myBonusesRawData = [];
let currentStatsType = 'skup';
let currentStatsRange = 'today';

let currentReportReceiptId = ""; 

// ==========================================
// FUNKCJA FORMATOWANIA WALUTY
// ==========================================
window.formatMoney = function(amount) {
    if (isNaN(amount)) return "0";
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// ==========================================
// FUNKCJA AUTORYZACJI SZEFA
// ==========================================
function isTravisVance() {
    return currentEmployeeName && currentEmployeeName.trim().toLowerCase() === "travis vance";
}

// ==========================================
// BAZA DANYCH - SKUP (KASA)
// ==========================================
const defaultInventory = [
    { name: "Zdobiona książka", min: 120, max: 120, category: "inne" },
    { name: "Dywan", min: 240, max: 240, category: "dom" },
    { name: "Komputer (laptop)", min: 600, max: 600, category: "elektronika" },
    { name: "Komputer (stacjonarny)", min: 680, max: 680, category: "elektronika" },
    { name: "Konsola", min: 400, max: 400, category: "elektronika" },
    { name: "Konsola DJ", min: 640, max: 640, category: "elektronika" },
    { name: "Kobieca plastikowa figurka", min: 100, max: 100, category: "inne" },
    { name: "Plastikowa figurka małpki", min: 80, max: 80, category: "inne" },
    { name: "Kwiat", min: 65, max: 65, category: "dom" },
    { name: "Gitara elektryczna", min: 480, max: 480, category: "elektronika" },
    { name: "Dziwna substancja", min: 100, max: 100, category: "inne" },
    { name: "Dziwna szara substancja", min: 160, max: 160, category: "inne" },
    { name: "Biżuteria", min: 240, max: 240, category: "biżuteria" },
    { name: "Brudna biżuteria", min: 150, max: 150, category: "biżuteria" },
    { name: "Katana", min: 480, max: 480, category: "inne" },
    { name: "Mikrofala", min: 280, max: 280, category: "dom" },
    { name: "Mikser", min: 160, max: 160, category: "dom" },
    { name: "Monitor", min: 150, max: 150, category: "elektronika" },
    { name: "Obraz", min: 115, max: 115, category: "dom" },
    { name: "Obraz ścienny", min: 180, max: 180, category: "dom" },
    { name: "Głośnik", min: 145, max: 145, category: "elektronika" },
    { name: "Telewizor", min: 600, max: 600, category: "elektronika" },
    { name: "Zegarek", min: 160, max: 160, category: "biżuteria" },
    { name: "Złota bransoletka", min: 200, max: 200, category: "biżuteria" },
    { name: "Złota moneta", min: 200, max: 200, category: "inne" },
    { name: "Złota moneta z prezydentem", min: 200, max: 200, category: "inne" },
    { name: "Złote kolczyki", min: 200, max: 200, category: "biżuteria" },
    { name: "Popsuty telefon", min: 95, max: 95, category: "elektronika" }
];

let inventory = [];
let counts = {};
let currentCategory = 'wszystkie';
let currentMinTotal = 0; 
let currentMaxTotal = 0; 
let isStatAddedForCurrentReceipt = false;
let currentCustomerSSN = "";

// ==========================================
// BAZA DANYCH - EKSPORT (SPRZEDAŻ)
// ==========================================
const defaultExportInventory = [
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

let exportInventory = [];
let countsExport = {};
let currentCategoryExport = 'wszystkie';
let currentTotalExport = 0;
let lastGeneratedReportID = ""; 
let currentCustomerSSNExport = "";

// ==========================================
// FUNKCJE POMOCNICZE (DATY, ID)
// ==========================================
function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
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

function generateID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = 'EC-';
    for(let i=0; i<8; i++) res += chars[Math.floor(Math.random()*chars.length)];
    return res;
}

document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// SYSTEM PRZEŁĄCZANIA WIDOKÓW (SPA)
// ==========================================
window.switchView = function(view) {
    if (!currentEmployeeName && document.getElementById('login-screen').classList.contains('active')) {
        return; 
    }

    currentActiveView = view;
    const themeStyle = document.getElementById('theme-style');
    
    const viewSkup = document.getElementById('view-skup');
    const viewExport = document.getElementById('view-export');
    const navLogoIcon = document.getElementById('nav-logo-icon');

    if (view === 'skup') {
        if(themeStyle) themeStyle.href = `style.css?v=${APP_VERSION}`;
        viewSkup.style.display = 'block';
        viewExport.style.display = 'none';
        navLogoIcon.className = 'fas fa-cash-register';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    } else if (view === 'export') {
        if(themeStyle) themeStyle.href = `style-sprzedaz.css?v=${APP_VERSION}`;
        viewSkup.style.display = 'none';
        viewExport.style.display = 'block';
        navLogoIcon.className = 'fas fa-box-open';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    }
    
    document.getElementById('user-dropdown').classList.remove('active');
}

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
            currentEmployeeRank = data.rank || "Pracownik"; 
            currentEmployeeSsn = data.ssn || "---"; 
            currentEmployeeDateZatrudnienia = data.dateZatrudnienia || "Brak danych";
            currentEmployeePhoto = data.photo || ""; 
            
            const adminChangelogBtn = document.getElementById('admin-changelog-btn');
            const adminReportsBtn = document.getElementById('admin-reports-btn');
            if (adminChangelogBtn) adminChangelogBtn.style.display = isTravisVance() ? 'flex' : 'none';
            if (adminReportsBtn) adminReportsBtn.style.display = isTravisVance() ? 'flex' : 'none';

            document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
            document.getElementById('dropdown-user-name').innerText = currentEmployeeName;
            document.getElementById('dropdown-user-rank').innerText = currentEmployeeRank;
            
            const navAvatar = document.getElementById('nav-user-avatar');
            const navDefaultIcon = document.getElementById('nav-user-default-icon');
            const dropAvatar = document.getElementById('dropdown-user-avatar');
            const dropDefaultIcon = document.getElementById('dropdown-user-default-icon');

            if (currentEmployeePhoto && currentEmployeePhoto !== "") {
                navAvatar.src = currentEmployeePhoto;
                navAvatar.style.display = 'block';
                navDefaultIcon.style.display = 'none';
                
                dropAvatar.src = currentEmployeePhoto;
                dropAvatar.style.display = 'block';
                dropDefaultIcon.style.display = 'none';
            } else {
                navAvatar.style.display = 'none';
                navDefaultIcon.style.display = 'block';
                
                dropAvatar.style.display = 'none';
                dropDefaultIcon.style.display = 'block';
            }

            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-profile').style.display = 'block';
            
            const banner = document.getElementById('announcement-banner');
            if(banner) banner.style.display = 'flex';

            showNotice(`Rozpoczęto zmianę: ${data.name}`, "success");
            
            initSkup();
            initExport();
            fetchChangelogData();
            
            switchView('skup');
            
            checkEmployeeBonuses();

        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (error) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Odblokuj system <i class="fas fa-unlock"></i>';
    }
}

window.logout = function() {
    currentEmployeeName = "";
    currentEmployeeRank = "Pracownik";
    currentEmployeeSsn = "---";
    currentEmployeeDateZatrudnienia = "---";
    currentEmployeePhoto = ""; 
    document.getElementById('employee-login-pin').value = "";
    document.getElementById('logged-user-name').innerText = "---";
    document.getElementById('dropdown-user-name').innerText = "---";
    document.getElementById('dropdown-user-rank').innerText = "---";
    
    const navAvatar = document.getElementById('nav-user-avatar');
    const navDefaultIcon = document.getElementById('nav-user-default-icon');
    const dropAvatar = document.getElementById('dropdown-user-avatar');
    const dropDefaultIcon = document.getElementById('dropdown-user-default-icon');
    
    if(navAvatar) navAvatar.style.display = 'none';
    if(navDefaultIcon) navDefaultIcon.style.display = 'block';
    if(dropAvatar) dropAvatar.style.display = 'none';
    if(dropDefaultIcon) dropDefaultIcon.style.display = 'block';

    document.getElementById('login-screen').classList.add('active');
    
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('user-dropdown').classList.remove('active');
    
    const adminChangelogBtn = document.getElementById('admin-changelog-btn');
    const adminReportsBtn = document.getElementById('admin-reports-btn');
    if(adminChangelogBtn) adminChangelogBtn.style.display = 'none';
    if(adminReportsBtn) adminReportsBtn.style.display = 'none';
    
    const banner = document.getElementById('announcement-banner');
    if(banner) banner.style.display = 'none';

    const clContainer = document.getElementById('dynamic-changelog-container');
    if (clContainer) clContainer.innerHTML = '';

    resetCartAndInventory();
    resetCartAndInventoryExport();
    
    showNotice("Zakończono zmianę. Wylogowano.", "info");
}

window.toggleUserMenu = function() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const profile = document.getElementById('user-profile');
    const dropdown = document.getElementById('user-dropdown');
    if (profile && dropdown && !profile.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// ==========================================
// SYSTEM POWIADOMIEŃ O PREMII
// ==========================================
async function checkEmployeeBonuses() {
    try {
        const res = await fetch(`${REPORTS_API_URL}?action=get_bonuses&t=${new Date().getTime()}`);
        const data = await res.json();
        
        if (data.bonuses && data.bonuses.length > 0) {
            const myUnreadBonuses = data.bonuses.filter(b => b.employee === currentEmployeeName && b.status === "Nieodebrane");
            
            if (myUnreadBonuses.length > 0) {
                let totalBonus = 0;
                let detailsHtml = "";
                
                myUnreadBonuses.forEach(b => {
                    totalBonus += parseFloat(b.amount) || 0;
                    detailsHtml += `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; align-items: center;">
                            <span style="color: var(--text-secondary); text-align: left; line-height: 1.2;">
                                <strong style="color: var(--text-primary); font-size: 0.8rem;">Od: ${b.boss}</strong><br>
                                <small>${b.reason}</small>
                            </span>
                            <strong style="color: var(--ad-gold); font-size: 1.1rem;">+${window.formatMoney(b.amount)}$</strong>
                        </div>
                    `;
                });

                document.getElementById('bonus-notification-details').innerHTML = `
                    <div style="font-size: 2.5rem; font-weight: 900; color: var(--success); margin-bottom: 15px; text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);">
                        +${window.formatMoney(totalBonus)}$
                    </div>
                    <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px; text-align: left;">
                        ${detailsHtml}
                    </div>
                `;
                
                document.getElementById('bonus-notification-modal').classList.add('active');

                fetch(REPORTS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'mark_bonus_read',
                        employee: currentEmployeeName
                    })
                }).catch(e => console.error("Błąd oznaczania premii", e));
            }
        }
    } catch (e) {
        console.error("Błąd sprawdzania premii:", e);
    }
}

window.closeBonusNotification = function() {
    document.getElementById('bonus-notification-modal').classList.remove('active');
}

// ==========================================
// LOKALNE STATYSTYKI SKUPU
// ==========================================
function getDailyStat(employeeName) {
    const date = getFormattedDate();
    const key = `elcartel_stats_${employeeName}_${date}`;
    return parseFloat(localStorage.getItem(key)) || 0;
}

function addDailyStat(employeeName, amount) {
    const date = getFormattedDate();
    const key = `elcartel_stats_${employeeName}_${date}`;
    const current = getDailyStat(employeeName);
    localStorage.setItem(key, current + amount);
}

// ==========================================
// LOGIKA - SKUP (KASA)
// ==========================================
function initSkup() {
    document.getElementById('header-date').innerText = getFormattedDate();
    resetCartAndInventory();
    
    const adInput = document.getElementById('ad-input');
    if(adInput) {
        adInput.addEventListener('input', updateAdPreview);
        updateAdPreview();
    }
    updateCartView(); 
}

function resetCartAndInventory() {
    inventory = JSON.parse(JSON.stringify(defaultInventory));
    counts = {};
    
    inventory.forEach((_, index) => { counts[index] = 0; });

    const finalPriceInput = document.getElementById('final-price-input');
    if (finalPriceInput) finalPriceInput.value = "";
    
    const ssnInput = document.getElementById('customer-ssn-input');
    if (ssnInput) ssnInput.value = "";
    currentCustomerSSN = "";

    renderInventory();
    calculateTotal();
}

function renderInventory() {
    const list = document.getElementById('items-list');
    if(!list) return;
    list.innerHTML = ''; 
    
    const customCards = [];
    const normalCards = [];

    inventory.forEach((item, index) => {
        if(counts[index] === undefined) counts[index] = 0;
        
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        
        if (item.isCustom) {
            card.classList.add('custom-card-special');
            card.innerHTML = `
                <div class="item-info" style="width: 60%;">
                    <input type="text" id="custom-name-${index}" class="custom-item-name" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}" oninput="updateCustomName(${index}, this.value)">
                    <input type="number" id="custom-price-${index}" class="custom-item-price" placeholder="Cena $" min="0" value="${item.min > 0 ? item.min : ''}" oninput="updateCustomPrice(${index}, this.value)">
                </div>
                <div class="controls">
                    <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                    <input type="number" id="count-${index}" class="quantity-input" value="${counts[index]}" min="0" oninput="handleInput(${index}, this.value)">
                    <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
                </div>
            `;
            customCards.push(card);
        } else {
            card.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.min === item.max ? item.min + '$' : item.min + '$ - ' + item.max + '$'}</span>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                    <input type="number" id="count-${index}" class="quantity-input" value="${counts[index]}" min="0" oninput="handleInput(${index}, this.value)">
                    <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
                </div>
            `;
            normalCards.push(card);
        }
    });
    
    customCards.forEach(c => list.appendChild(c));
    normalCards.forEach(c => list.appendChild(c));
    
    applyFilters();
}

window.addCustomItemSlot = function() {
    const index = inventory.length;
    inventory.push({ name: "Własny przedmiot", min: 0, max: 0, category: "inne", isCustom: true });
    counts[index] = 0;

    renderInventory();
    showNotice("Dodano nowe pole na własny przedmiot (Skup)!", "success");
}

window.updateCustomName = function(index, value) {
    inventory[index].name = value || "Własny przedmiot";
    const inputField = document.getElementById(`custom-name-${index}`);
    if(inputField) {
        const card = inputField.closest('.item-card');
        if(card) card.setAttribute('data-name', inventory[index].name.toLowerCase());
    }
    updateCartView();
}

window.updateCustomPrice = function(index, value) {
    let price = parseFloat(value) || 0;
    inventory[index].min = price;
    inventory[index].max = price;
    calculateTotal();
}

window.updateCount = function(index, change) {
    counts[index] = Math.max(0, (counts[index] || 0) + change);
    const countInput = document.getElementById(`count-${index}`);
    if (countInput) countInput.value = counts[index];
    calculateTotal();
}

window.handleInput = function(index, value) {
    counts[index] = Math.max(0, parseInt(value) || 0);
    calculateTotal();
}

function calculateTotal() {
    let min = 0, max = 0;
    inventory.forEach((item, index) => {
        min += item.min * (counts[index] || 0);
        max += item.max * (counts[index] || 0);
    });
    currentMinTotal = min; 
    currentMaxTotal = max; 
    const totalPriceEl = document.getElementById('total-price');
    if(totalPriceEl) totalPriceEl.innerText = min + '$';
    
    const bonusEl = document.getElementById('bonus-range');
    if (bonusEl) {
        bonusEl.innerText = '+' + (max - min) + '$';
    }
    
    updateCartView();
}

window.toggleCart = function() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

function updateCartView() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge');
    const sidebarTotal = document.getElementById('cart-sidebar-total');
    
    let totalItems = 0;
    let html = '';

    inventory.forEach((item, index) => {
        if (counts[index] > 0) {
            totalItems += counts[index];
            let itemTotalMin = item.min * counts[index];
            let itemTotalMax = item.max * counts[index];
            let priceText = item.min === item.max ? `${itemTotalMin}$` : `${itemTotalMin}$ - ${itemTotalMax}$`;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-info-col">
                        <span class="cart-item-name">${item.name}</span>
                        <div class="cart-controls">
                            <button class="cart-btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                            <span class="cart-item-qty">${counts[index]}</span>
                            <button class="cart-btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${priceText}</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) {
        html = '<div class="empty-cart-msg">Koszyk jest pusty</div>';
    }

    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentMinTotal + '$' + (currentMaxTotal > currentMinTotal ? ` - ${currentMaxTotal}$` : '');
}

window.filterCategory = function(cat, btn) {
    currentCategory = cat;
    const viewSkup = document.getElementById('view-skup');
    if(viewSkup) {
        viewSkup.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if(btn) btn.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const searchInputEl = document.getElementById('search-input');
    const term = searchInputEl ? searchInputEl.value.toLowerCase() : "";
    const adSection = document.getElementById('ad-section');
    const itemsList = document.getElementById('items-list');
    const asortymentHeader = document.getElementById('asortyment-header-wrapper');

    if (currentCategory === 'reklama') {
        if(adSection) adSection.classList.remove('hidden');
        if(itemsList) itemsList.classList.add('hidden');
        if(asortymentHeader) asortymentHeader.classList.add('hidden');
    } else {
        if(adSection) adSection.classList.add('hidden');
        if(itemsList) itemsList.classList.remove('hidden');
        if(asortymentHeader) asortymentHeader.classList.remove('hidden');
        if(itemsList) {
            itemsList.querySelectorAll('.item-card').forEach(card => {
                const name = card.getAttribute('data-name') || '';
                const cat = card.getAttribute('data-category') || '';
                const match = name.includes(term) && (currentCategory === 'wszystkie' || cat === currentCategory);
                card.classList.toggle('hidden', !match);
            });
        }
    }
}

window.generateQuote = async function() {
    const hasItems = Object.values(counts).some(c => c > 0);
    const finalPriceInput = document.getElementById('final-price-input');
    const finalPrice = finalPriceInput ? parseFloat(finalPriceInput.value) : NaN;
    const ssnInput = document.getElementById('customer-ssn-input');
    currentCustomerSSN = ssnInput ? ssnInput.value.trim() : "";

    if (!hasItems) return showNotice("Koszyk skupu jest pusty!", "warning");
    
    if (isNaN(finalPrice)) {
        return showNotice("Wpisz kwotę transakcji!", "danger");
    }
    
    if (finalPrice < currentMinTotal) {
        return showNotice(`Kwota zbyt niska! Wymagane: ${currentMinTotal}$.`, "danger");
    }

    if (finalPrice > currentMaxTotal) {
        return showNotice(`Kwota zbyt wysoka! Wymagane: ${currentMaxTotal}$.`, "danger");
    }

    const btn = document.getElementById('quote-btn');
    if(!btn) return;
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie...';

    setTimeout(() => {
        finalizeQuote(currentEmployeeName, finalPrice);
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }, 400);
}

function finalizeQuote(employeeName, finalPrice) {
    isStatAddedForCurrentReceipt = false;
    
    const receiptID = generateID();
    const currentReceiptDateEl = document.getElementById('current-receipt-date');
    if(currentReceiptDateEl) currentReceiptDateEl.innerText = getFormattedDate();
    
    const receiptIdDisplay = document.getElementById('receipt-id-display');
    if(receiptIdDisplay) receiptIdDisplay.innerText = `NR: ${receiptID}`;
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSN !== "") {
        employeeText += `<br>KLIENT (SSN): ${currentCustomerSSN}`;
    }
    const receiptEmployeeDisplay = document.getElementById('receipt-employee-display');
    if(receiptEmployeeDisplay) receiptEmployeeDisplay.innerHTML = employeeText;
    
    const receiptTotal = document.getElementById('receipt-total');
    if(receiptTotal) receiptTotal.innerText = finalPrice + '$';

    const itemsDiv = document.getElementById('receipt-items');
    if(itemsDiv) {
        itemsDiv.innerHTML = '';
        const ratio = finalPrice / currentMinTotal;

        inventory.forEach((item, i) => {
            if (counts[i] > 0) {
                const row = document.createElement('div');
                row.className = 'receipt-row';
                const calculatedItemTotal = Math.round(item.min * counts[i] * ratio);
                row.innerHTML = `<span>${item.name} [x${counts[i]}]</span><span>${calculatedItemTotal}$</span>`;
                itemsDiv.appendChild(row);
            }
        });

        let sigDiv = document.querySelector('.receipt-signature');
        if (!sigDiv) {
            sigDiv = document.createElement('div');
            sigDiv.className = 'receipt-signature';
            itemsDiv.parentNode.insertBefore(sigDiv, document.querySelector('.receipt-footer'));
        }
        sigDiv.innerHTML = `<span class="signature-label">Podpis pracownika</span><span class="signature-text">${employeeName}</span>`;
    }

    const quoteModal = document.getElementById('quote-modal');
    if(quoteModal) quoteModal.classList.add('active');
}

async function sendToDiscord() {
    const btn = document.getElementById('send-discord-btn');
    const area = document.getElementById('receipt-capture-area');
    if(!area || !btn) return;
    
    const receiptIDDisplay = document.getElementById('receipt-id-display');
    const receiptID = receiptIDDisplay ? receiptIDDisplay.innerText.replace('NR: ', '') : '';
    const employee = currentEmployeeName; 
    const finalPriceTextEl = document.getElementById('receipt-total');
    const finalPriceText = finalPriceTextEl ? finalPriceTextEl.innerText : '0$';
    const finalPriceNumeric = parseFloat(finalPriceText.replace('$', ''));

    btn.disabled = true;
    btn.innerText = "Wysyłanie...";

    const itemsToLog = [];
    let remainingAmount = finalPriceNumeric;
    const ratio = finalPriceNumeric / currentMinTotal;
    
    const activeItems = inventory.map((item, index) => ({ item, index })).filter(x => counts[x.index] > 0);

    activeItems.forEach((x, arrayIndex) => {
        const item = x.item;
        const count = counts[x.index];
        let calculatedTotal;
        
        if (arrayIndex === activeItems.length - 1) {
            calculatedTotal = remainingAmount;
        } else {
            calculatedTotal = Math.round(item.min * count * ratio);
            remainingAmount -= calculatedTotal;
        }

        itemsToLog.push({
            name: item.name,
            qty: count,
            total: calculatedTotal
        });
    });

    const logPayload = {
        action: "save_receipt",
        type: "skup",
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: receiptID, 
        items: itemsToLog
    };

    try {
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "paragon.png");
            
            let employeeFieldValue = `**${employee}**`;
            if (currentCustomerSSN !== "") {
                employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSN}**)`;
            }

            const embedPayload = {
                embeds: [{
                    title: "📑 Wystawiono nowy paragon!",
                    color: 36991, 
                    fields: [
                        { name: "📋 Numer paragonu:", value: `\`${receiptID}\``, inline: true },
                        { name: "👤 Pracownik:", value: employeeFieldValue, inline: true },
                        { name: "💰 Suma:", value: `**${finalPriceText}**`, inline: false }
                    ],
                    image: { url: "attachment://paragon.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System EL CARTEL PAWN SHOP" }
                }]
            };

            formData.append("payload_json", JSON.stringify(embedPayload));
            
            const res = await fetch(DISCORD_WEBHOOK_URL_SKUP, { method: "POST", body: formData });
            if (res.ok) {
                fetch(REPORTS_API_URL, {
                    method: "POST",
                    body: JSON.stringify(logPayload)
                }).catch(e => console.error("Błąd zapisu w arkuszu:", e));

                if (!isStatAddedForCurrentReceipt) {
                    addDailyStat(currentEmployeeName, finalPriceNumeric);
                    isStatAddedForCurrentReceipt = true;
                }
                
                showNotice("Wysłano na Discord i zaktualizowano obrót!", "success");
                
                resetCartAndInventory();
                closeModal();
            } else throw new Error();
        }, "image/png");
    } catch (e) {
        showNotice("Błąd Webhooka!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij na Discord';
    }
}

window.copyReceiptToClipboard = async function() {
    const btn = document.getElementById('copy-receipt-btn');
    const area = document.getElementById('receipt-capture-area');
    if(!area || !btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';

    try {
        const canvas = await html2canvas(area, { 
            scale: 2, 
            backgroundColor: "#ffffff",
            useCORS: true 
        });
        
        canvas.toBlob(async (blob) => {
            try {
                const data = [new ClipboardItem({ [blob.type]: blob })];
                await navigator.clipboard.write(data);
                
                showNotice("Skopiowano paragon do schowka!", "success");
            } catch (err) {
                showNotice("Błąd kopiowania! Spróbuj innej przeglądarki.", "danger");
            }
        });
    } catch (e) {
        showNotice("Błąd generowania obrazu!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-copy"></i> Wydaj paragon klientowi';
    }
}

window.updateAdPreview = function() {
    const input = document.getElementById('ad-input');
    if(!input) return;
    
    const preview = document.getElementById('ad-preview');
    const colors = {'~r~':'#ff4444','~g~':'#33ff33','~b~':'#3399ff','~y~':'#ffff33','~p~':'#cc66ff','~o~':'#ff9933','~w~':'#fff','~s~':'#fff'};
    let html = "", style = "color:#fff", bold = false;
    
    input.value.split(/(~[a-z]~)/g).forEach(p => {
        if (p === '~h~') bold = !bold;
        else if (colors[p]) style = `color:${colors[p]}`;
        else html += `<span style="${style};font-weight:${bold?900:400}">${p}</span>`;
    });
    if(preview) preview.innerHTML = html;
}

window.insertTag = function(tag) {
    const area = document.getElementById('ad-input');
    if(!area) return;
    const s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.substring(0, s) + tag + area.value.substring(e);
    updateAdPreview();
}

window.copyAd = function() {
    const adInput = document.getElementById('ad-input');
    if(adInput) {
        navigator.clipboard.writeText(adInput.value);
        showNotice("Skopiowano reklamę!", "success");
    }
}

window.closeModal = function() { 
    const quoteModal = document.getElementById('quote-modal');
    if(quoteModal) quoteModal.classList.remove('active'); 
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

// ==========================================
// LOGIKA - EKSPORT (SPRZEDAŻ)
// ==========================================
function initExport() {
    const list = document.getElementById('items-list-export');
    if (!list) return;
    
    list.innerHTML = '';
    const headerDateExport = document.getElementById('header-date-export');
    if(headerDateExport) headerDateExport.innerText = getFormattedDate();
    
    resetCartAndInventoryExport();
}

function resetCartAndInventoryExport() {
    exportInventory = JSON.parse(JSON.stringify(defaultExportInventory));
    countsExport = {};
    
    exportInventory.forEach((_, index) => { countsExport[index] = 0; });

    const ssnInput = document.getElementById('customer-ssn-input-export');
    if (ssnInput) ssnInput.value = "";
    currentCustomerSSNExport = "";

    renderInventoryExport();
    calculateTotalExport();
}

function renderInventoryExport() {
    const list = document.getElementById('items-list-export');
    if(!list) return;
    list.innerHTML = ''; 
    
    exportInventory.forEach((item, index) => {
        if(countsExport[index] === undefined) countsExport[index] = 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        
        if(item.isCustom) {
            card.classList.add('custom-item');
            card.id = `custom-card-export-${index}`;
            card.innerHTML = `
                <div class="custom-inputs-wrapper">
                    <input type="text" class="custom-name-input" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}" oninput="updateCustomNameExport(${index}, this.value)">
                    <input type="number" class="custom-price-input" placeholder="Cena $" min="0" value="${item.price > 0 ? item.price : ''}" oninput="updateCustomPriceExport(${index}, this.value)">
                </div>
                <div class="controls">
                    <button class="btn-circle minus" onclick="updateCountExport(${index}, -1)">-</button>
                    <input type="number" id="count-export-${index}" class="quantity-input" value="${countsExport[index]}" min="0" oninput="handleInputExport(${index}, this.value)">
                    <button class="btn-circle plus" onclick="updateCountExport(${index}, 1)">+</button>
                </div>
            `;
            list.insertBefore(card, list.firstChild);
        } else {
            card.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">Sprzedaż: ${item.price}$</span>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" onclick="updateCountExport(${index}, -1)">-</button>
                    <input type="number" id="count-export-${index}" class="quantity-input" value="${countsExport[index]}" min="0" oninput="handleInputExport(${index}, this.value)">
                    <button class="btn-circle plus" onclick="updateCountExport(${index}, 1)">+</button>
                </div>
            `;
            list.appendChild(card);
        }
    });
    
    applyFiltersExport();
}

window.addCustomItemSlotExport = function() {
    const index = exportInventory.length; 
    
    exportInventory.push({ name: "Własny przedmiot", price: 0, category: "custom", isCustom: true });
    countsExport[index] = 1;

    renderInventoryExport();
    calculateTotalExport();
    showNotice("Dodano nowe pole na własny przedmiot (Eksport)!", "success");
}

window.updateCustomNameExport = function(i, val) {
    exportInventory[i].name = val || "Własny przedmiot";
    updateCartViewExport();
}

window.updateCustomPriceExport = function(i, val) {
    exportInventory[i].price = parseInt(val) || 0;
    calculateTotalExport();
}

window.updateCountExport = function(i, change) {
    countsExport[i] = Math.max(0, (countsExport[i] || 0) + change);
    const input = document.getElementById(`count-export-${i}`);
    if (input) input.value = countsExport[i];
    calculateTotalExport();
}

window.handleInputExport = function(i, value) {
    countsExport[i] = Math.max(0, parseInt(value) || 0);
    calculateTotalExport();
}

function calculateTotalExport() {
    currentTotalExport = exportInventory.reduce((sum, item, i) => sum + (item.price * (countsExport[i] || 0)), 0);
    const totalDisplay = document.getElementById('total-price-export');
    if (totalDisplay) totalDisplay.innerText = currentTotalExport + '$';
    
    updateCartViewExport();
}

window.toggleCartExport = function() {
    const sidebar = document.getElementById('cart-sidebar-export');
    if (sidebar) sidebar.classList.toggle('active');
};

window.updateCartViewExport = function() {
    const container = document.getElementById('cart-items-container-export');
    const badge = document.getElementById('cart-badge-export');
    const sidebarTotal = document.getElementById('cart-sidebar-total-export');
    
    let totalItems = 0;
    let html = '';

    exportInventory.forEach((item, index) => {
        if (countsExport[index] > 0) {
            totalItems += countsExport[index];
            let itemTotal = item.price * countsExport[index];
            let displayName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-info-col">
                        <span class="cart-item-name">${displayName}</span>
                        <div class="cart-controls">
                            <button class="cart-btn-circle minus" onclick="updateCountExport(${index}, -1)">-</button>
                            <span class="cart-item-qty">${countsExport[index]}</span>
                            <button class="cart-btn-circle plus" onclick="updateCountExport(${index}, 1)">+</button>
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
    if (sidebarTotal) sidebarTotal.innerText = currentTotalExport + '$';
};

window.filterCategoryExport = function(cat, btn) {
    currentCategoryExport = cat;
    const viewExport = document.getElementById('view-export');
    if(viewExport) {
        viewExport.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    applyFiltersExport();
}

function applyFiltersExport() {
    const searchInputExportEl = document.getElementById('search-input-export');
    const term = searchInputExportEl ? searchInputExportEl.value.toLowerCase() : "";
    const viewExport = document.getElementById('view-export');
    if(viewExport) {
        viewExport.querySelectorAll('.item-card:not(.custom-item)').forEach(card => {
            const dataName = card.getAttribute('data-name');
            if(dataName) {
                const match = dataName.includes(term) && 
                              (currentCategoryExport === 'wszystkie' || card.getAttribute('data-category') === currentCategoryExport);
                card.classList.toggle('hidden', !match);
            }
        });
    }
}

window.generateQuoteExport = async function() {
    if (!Object.values(countsExport).some(c => c > 0)) return showNotice("Koszyk eksportu jest pusty!", "warning");
    
    const ssnInput = document.getElementById('customer-ssn-input-export');
    currentCustomerSSNExport = ssnInput ? ssnInput.value.trim() : "";

    const btn = document.getElementById('quote-btn-export');
    if(!btn) return;
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie...';

    setTimeout(() => {
        finalizeQuoteExport(currentEmployeeName);
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }, 400);
}

window.finalizeQuoteExport = function(employeeName) {
    lastGeneratedReportID = `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = getFormattedDate();
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSNExport !== "") {
        employeeText += `<br>KLIENT (SSN): ${currentCustomerSSNExport}`;
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
                ${exportInventory.map((item, i) => {
                    if (countsExport[i] > 0) {
                        let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
                        return `
                        <div class="receipt-row">
                            <span>${dName} x${countsExport[i]}</span>
                            <span>${item.price * countsExport[i]}$</span>
                        </div>
                        `;
                    }
                    return '';
                }).join('')}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-row total">
                <span>RAZEM:</span>
                <span>${currentTotalExport}$</span>
            </div>
            <p class="receipt-meta" style="margin-top: 15px;">Data wystawienia: ${date}</p>
            <div class="receipt-stamp">SPRZEDANO</div>
        </div>
    `;

    const preview = document.getElementById('receipt-preview-container-export');
    const capture = document.getElementById('receipt-capture-area-export');

    if (preview && capture) {
        preview.innerHTML = receiptHTML;
        capture.innerHTML = receiptHTML;
        const quoteModalExport = document.getElementById('quote-modal-export');
        if(quoteModalExport) quoteModalExport.classList.add('active');
    }
}

window.sendToDiscordExport = async function() {
    const btn = document.getElementById('send-discord-btn-export');
    const area = document.getElementById('receipt-capture-area-export');
    
    if (!area || !btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PRZETWARZANIE...';

    const itemsToLog = [];
    exportInventory.forEach((item, i) => {
        if (countsExport[i] > 0) {
            let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            itemsToLog.push({
                name: dName,
                qty: countsExport[i],
                total: item.price * countsExport[i]
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
            if (currentCustomerSSNExport !== "") {
                employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSNExport}**)`;
            }

            const embedPayload = {
                embeds: [{
                    title: "🚛 NOWY RAPORT SPRZEDAŻY",
                    color: 15995922,
                    fields: [
                        { name: "👤 Pracownik:", value: employeeFieldValue, inline: true },
                        { name: "📋 Nr raportu:", value: `\`${lastGeneratedReportID}\``, inline: true },
                        { name: "💰 Suma:", value: `\`${currentTotalExport}$\``, inline: false }
                    ],
                    image: { url: "attachment://raport.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System EL CARTEL EXPORT" }
                }]
            };

            formData.append("payload_json", JSON.stringify(embedPayload));

            const res = await fetch(DISCORD_WEBHOOK_URL_EXPORT, { method: "POST", body: formData });
            if (res.ok) {
                fetch(REPORTS_API_URL, {
                    method: "POST",
                    body: JSON.stringify(logPayload)
                }).catch(e => console.error("Błąd zapisu w arkuszu:", e));

                showNotice("Wysłano raport na Discord!", "success");
                closeModalExport();
                resetCartAndInventoryExport();
            } else {
                showNotice("Błąd Webhooka!", "danger");
            }
        }, "image/png");
    } catch (e) {
        showNotice("Błąd generatora obrazu!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij raport na Discord';
    }
}

window.closeModalExport = () => {
    const quoteModalExport = document.getElementById('quote-modal-export');
    if(quoteModalExport) quoteModalExport.classList.remove('active');
}

window.toggleSummaryExport = function() {
    const bar = document.getElementById('summary-bar-export');
    const icon = document.getElementById('toggle-icon-export');
    if (bar && icon) {
        bar.classList.toggle('open');
        if (bar.classList.contains('open')) {
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        } else {
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        }
    }
}

// ==========================================
// SYSTEM POWIADOMIEŃ I DYNAMICZNEGO CHANGELOGA (WSPÓLNY)
// ==========================================
async function fetchChangelogData() {
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        
        const clData = data.filter(r => r.type === "changelog");
        if (clData.length > 0) {
            const grouped = {};
            clData.forEach(r => {
                if (!grouped[r.report_id]) grouped[r.report_id] = { date: r.date, items: [] };
                grouped[r.report_id].items.push(r.name);
            });
            
            const sortedVersions = Object.keys(grouped).reverse();
            
            const container = document.getElementById('dynamic-changelog-container');
            if(container && sortedVersions.length > 0) {
                LATEST_CHANGELOG_VERSION = sortedVersions[0]; 
                container.innerHTML = ""; 
                
                sortedVersions.forEach((v, index) => {
                    let displayDate = grouped[v].date;
                    const d = parseDate(grouped[v].date);
                    if (d && !isNaN(d.getTime())) {
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        displayDate = `${day}.${month}.${year} ${hours}:${minutes}`;
                    }
                    
                    const dateLabel = index === 0 ? "Najnowsza" : displayDate;
                    
                    let listHtml = "";
                    
                    let displayVersion = v;
                    if (v.startsWith('v')) {
                        displayVersion = v.substring(1);
                    }
                    
                    grouped[v].items.forEach(itemStr => {
                        let tag = "INFO";
                        let desc = itemStr;
                        if(itemStr.includes('|||')) {
                            const parts = itemStr.split('|||');
                            tag = parts[0];
                            desc = parts[1];
                        }
                        
                        let clClass = "cl-tag";
                        if (tag === "NOWOŚĆ") clClass = "cl-new";
                        else if (tag === "POPRAWKA") clClass = "cl-fix";
                        else if (tag === "USUNIĘTO") clClass = "cl-del";

                        listHtml += `<li><span class="cl-tag ${clClass}">${tag}</span> ${desc}</li>`;
                    });

                    let adminControls = "";
                    if (isTravisVance()) {
                        const safeItems = encodeURIComponent(JSON.stringify(grouped[v].items));
                        adminControls = `
                            <div style="margin-left: auto; display: flex; gap: 12px;">
                                <button onclick="openEditChangelog('${v}', '${safeItems}')" style="background: none; border: none; color: var(--accent-color); cursor: pointer; font-size: 1.1rem; transition: 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--accent-color)'"><i class="fas fa-edit"></i></button>
                                <button onclick="deleteChangelog('${v}')" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; transition: 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--danger)'"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    }
                    
                    container.innerHTML += `
                        <div class="changelog-item">
                            <div class="changelog-version-header">
                                Wersja ${displayVersion} <span class="changelog-date">${dateLabel}</span>
                                ${adminControls}
                            </div>
                            <ul class="changelog-list">${listHtml}</ul>
                        </div>
                    `;
                });
                checkChangelogNotification();
            }
        }
    } catch(e) {
        console.log("Nie udało się pobrać dynamicznego changeloga", e);
        checkChangelogNotification(); 
    }
}

function checkChangelogNotification() {
    const seenVersion = localStorage.getItem('elcartel_changelog_seen');
    const navDot = document.getElementById('nav-notification-dot');
    const dropDot = document.getElementById('dropdown-notification-dot');
    
    if (seenVersion !== LATEST_CHANGELOG_VERSION) {
        if (navDot) navDot.classList.remove('hidden');
        if (dropDot) dropDot.classList.remove('hidden');
    } else {
        if (navDot) navDot.classList.add('hidden');
        if (dropDot) dropDot.classList.add('hidden');
    }
}

window.openChangelog = function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('changelog-modal').classList.add('active');
    
    localStorage.setItem('elcartel_changelog_seen', LATEST_CHANGELOG_VERSION);
    checkChangelogNotification(); 
}

window.closeChangelog = function() {
    document.getElementById('changelog-modal').classList.remove('active');
}

// ==========================================
// ADMIN: DODAWANIE CHANGELOGA
// ==========================================
window.openAdminChangelog = function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-changelog-modal').classList.add('active');
    if(document.getElementById('admin-changes-list').children.length === 0) {
        addAdminChangeSlot();
    }
}

window.closeAdminChangelog = function() {
    document.getElementById('admin-changelog-modal').classList.remove('active');
}

window.addAdminChangeSlot = function() {
    if (!isTravisVance()) return;
    const container = document.getElementById('admin-changes-list');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';
    div.innerHTML = `
        <select class="custom-input admin-change-tag" style="width: 120px; padding: 10px;">
            <option value="NOWOŚĆ">NOWOŚĆ</option>
            <option value="POPRAWKA">POPRAWKA</option>
            <option value="USUNIĘTO">USUNIĘTO</option>
        </select>
        <input type="text" class="custom-input admin-change-desc" placeholder="Opis zmiany..." style="flex: 1; padding: 10px;">
        <button type="button" class="settings-close-btn" style="width: 40px; height: 40px; flex-shrink: 0;" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

window.publishChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    const version = document.getElementById('admin-version-input').value.trim();
    if (!version) return showNotice("Podaj numer wersji!", "warning");
    
    const rows = document.querySelectorAll('#admin-changes-list > div');
    if (rows.length === 0) return showNotice("Dodaj co najmniej jedną zmianę!", "warning");
    
    let itemsToLog = [];
    let valid = true;
    
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if (!desc) valid = false;
        
        itemsToLog.push({
            name: `${tag}|||${desc}`,
            qty: 1,
            total: 0
        });
    });
    
    if (!valid) return showNotice("Wypełnij opisy wszystkich zmian!", "warning");
    
    const btn = document.getElementById('publish-changelog-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    const safeVersion = "v" + version;
    
    const logPayload = {
        action: "save_receipt",
        type: "changelog",
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: safeVersion, 
        items: itemsToLog
    };
    
    try {
        await fetch(REPORTS_API_URL, {
            method: "POST",
            body: JSON.stringify(logPayload)
        });
        
        showNotice("Changelog opublikowany pomyślnie!", "success");
        closeAdminChangelog();
        document.getElementById('admin-version-input').value = "";
        document.getElementById('admin-changes-list').innerHTML = "";
        
        fetchChangelogData(); 
        
    } catch(e) {
        showNotice("Błąd publikacji!", "danger");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

window.openEditChangelog = function(version, itemsJson) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    document.getElementById('changelog-modal').classList.remove('active'); 
    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('edit-cl-original-version').value = version;
    
    let displayVersion = version.startsWith('v') ? version.substring(1) : version;
    document.getElementById('edit-cl-version-input').value = displayVersion;
    
    const container = document.getElementById('edit-cl-changes-list');
    container.innerHTML = "";
    
    items.forEach(itemStr => {
        let tag = "INFO";
        let desc = itemStr;
        if(itemStr.includes('|||')) {
            const parts = itemStr.split('|||');
            tag = parts[0];
            desc = parts[1];
        }
        
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <select class="custom-input admin-change-tag" style="width: 120px; padding: 10px;">
                <option value="NOWOŚĆ" ${tag==='NOWOŚĆ'?'selected':''}>NOWOŚĆ</option>
                <option value="POPRAWKA" ${tag==='POPRAWKA'?'selected':''}>POPRAWKA</option>
                <option value="USUNIĘTO" ${tag==='USUNIĘTO'?'selected':''}>USUNIĘTO</option>
            </select>
            <input type="text" class="custom-input admin-change-desc" value="${desc.replace(/"/g, '&quot;')}" style="flex: 1; padding: 10px;">
            <button type="button" class="settings-close-btn" style="width: 40px; height: 40px; flex-shrink: 0;" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('edit-changelog-modal').classList.add('active');
}

window.closeEditChangelog = function() {
    document.getElementById('edit-changelog-modal').classList.remove('active');
    document.getElementById('changelog-modal').classList.add('active'); 
}

window.addEditChangeSlot = function() {
    if (!isTravisVance()) return;
    const container = document.getElementById('edit-cl-changes-list');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';
    div.innerHTML = `
        <select class="custom-input admin-change-tag" style="width: 120px; padding: 10px;">
            <option value="NOWOŚĆ">NOWOŚĆ</option>
            <option value="POPRAWKA">POPRAWKA</option>
            <option value="USUNIĘTO">USUNIĘTO</option>
        </select>
        <input type="text" class="custom-input admin-change-desc" placeholder="Opis zmiany..." style="flex: 1; padding: 10px;">
        <button type="button" class="settings-close-btn" style="width: 40px; height: 40px; flex-shrink: 0;" onclick="this.parentElement.remove()">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

window.saveEditedChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    const origVersion = document.getElementById('edit-cl-original-version').value;
    const newVersion = document.getElementById('edit-cl-version-input').value.trim();
    if(!newVersion) return showNotice("Podaj numer wersji!", "warning");
    
    const rows = document.querySelectorAll('#edit-cl-changes-list > div');
    if(rows.length === 0) return showNotice("Musisz podać chociaż jedną zmianę!", "warning");
    
    let itemsToLog = [];
    let valid = true;
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if(!desc) valid = false;
        itemsToLog.push({ name: `${tag}|||${desc}`, qty: 1, total: 0 });
    });
    
    if(!valid) return showNotice("Wypełnij puste opisy!", "warning");
    
    const safeNewVersion = newVersion.startsWith('v') ? newVersion : 'v' + newVersion;
    
    const btn = document.getElementById('save-edit-cl-btn');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'edit_changelog',
                original_version: origVersion,
                new_version: safeNewVersion,
                items: itemsToLog,
                employee: currentEmployeeName,
                date: getFormattedDateTime()
            })
        });
        showNotice("Zaktualizowano changelog!", "success");
        closeEditChangelog();
        fetchChangelogData();
    } catch(e) {
        showNotice("Błąd edycji!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

window.deleteChangelog = async function(version) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    if(!confirm("Na pewno usunąć tę wersję changelogu: " + version + "?")) return;
    
    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete_changelog',
                version: version
            })
        });
        showNotice("Usunięto wersję " + version + "!", "success");
        fetchChangelogData(); 
    } catch(e) {
        showNotice("Błąd usuwania!", "danger");
    }
}

// ==========================================
// SYSTEM USTAWIEŃ
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

    if (!oldPin || !newPin || !confirmPin) return showNotice("Wypełnij wszystkie pola!", "warning");
    if (newPin !== confirmPin) return showNotice("Nowe kody PIN nie są identyczne!", "danger");
    if (newPin.length < 4) return showNotice("Nowy PIN musi mieć dokładnie 4 cyfry!", "warning");
    if (oldPin === newPin) return showNotice("Nowy PIN musi różnić się od starego!", "warning");

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
// MOJE STATYSTYKI (WSPÓLNY)
// ==========================================
window.openMyStats = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-stats-modal').classList.add('active');
    
    document.getElementById('my-stats-loader').classList.remove('hidden');
    document.getElementById('my-stats-content').classList.add('hidden');
    
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        
        myStatsRawData = rawData.filter(row => row.employee === currentEmployeeName);
        
        document.getElementById('my-stats-time-filter').value = 'today';
        currentStatsType = currentActiveView === 'export' ? 'sprzedaz' : 'skup';
        currentStatsRange = 'today';
        
        document.getElementById('btn-stats-skup').classList.toggle('active', currentStatsType === 'skup');
        document.getElementById('btn-stats-sprzedaz').classList.toggle('active', currentStatsType === 'sprzedaz');

        renderMyStatsDisplay();
        
        document.getElementById('my-stats-loader').classList.add('hidden');
        document.getElementById('my-stats-content').classList.remove('hidden');
        
    } catch (err) {
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
    const typeData = myStatsRawData.filter(row => row.employee === currentEmployeeName && row.type === currentStatsType);
    
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
    if (currentStatsRange === 'today' && currentStatsType === 'skup') {
        let localToday = getDailyStat(currentEmployeeName);
        displayPeriodTotal = Math.max(periodTotal, localToday); 
    }
    
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

// ==========================================
// MOJE TRANSAKCJE ORAZ PREMIE
// ==========================================
window.openMyTransactions = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-transactions-modal').classList.add('active');
    
    document.getElementById('my-transactions-loader').classList.remove('hidden');
    document.getElementById('my-transactions-content').classList.add('hidden');
    
    try {
        const [reportsRes, bonusesRes] = await Promise.all([
            fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`),
            fetch(`${REPORTS_API_URL}?action=get_bonuses&t=${new Date().getTime()}`)
        ]);
        
        const rawData = await reportsRes.json();
        const bonusesData = await bonusesRes.json();
        
        myStatsRawData = rawData.filter(row => row.employee === currentEmployeeName);
        myBonusesRawData = (bonusesData.bonuses || []).filter(b => b.employee === currentEmployeeName);
        
        switchTransView('historia');
        
        document.getElementById('my-transactions-loader').classList.add('hidden');
        document.getElementById('my-transactions-content').classList.remove('hidden');
    } catch (err) {
        document.getElementById('my-transactions-loader').innerHTML = '<p style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchTransView = function(view) {
    const btnHist = document.getElementById('btn-trans-historia');
    const btnPremie = document.getElementById('btn-trans-premie');
    const contHist = document.getElementById('transactions-list-container');
    const contPremie = document.getElementById('bonuses-list-container');
    const desc = document.getElementById('my-transactions-desc');

    if (view === 'historia') {
        btnHist.classList.add('active');
        btnPremie.classList.remove('active');
        contHist.classList.remove('hidden');
        contPremie.classList.add('hidden');
        desc.innerText = "Historia Twoich transakcji. Możesz zgłosić pomyłkę w wystawionym paragonie.";
        renderTransactionsList();
    } else {
        btnHist.classList.remove('active');
        btnPremie.classList.add('active');
        contHist.classList.add('hidden');
        contPremie.classList.remove('hidden');
        desc.innerText = "Historia otrzymanych premii finansowych od zarządu.";
        renderBonusesList();
    }
}

function renderTransactionsList() {
    const container = document.getElementById('transactions-list-container');
    container.innerHTML = '';
    
    if (!myStatsRawData || myStatsRawData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Brak transakcji w historii.</p>';
        return;
    }

    const grouped = {};
    myStatsRawData.forEach(row => {
        if (!row.report_id) return;
        if (!grouped[row.report_id]) {
            let displayDate = row.date;
            const d = parseDate(row.date);
            if (d && !isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                displayDate = `${day}.${month}.${year} ${hours}:${minutes}`;
            }

            grouped[row.report_id] = {
                date: displayDate,
                total: 0,
                items: [],
                type: row.type
            };
        }
        grouped[row.report_id].total += row.total;
        grouped[row.report_id].items.push(`${row.name} (x${row.qty}) - ${row.total}$`);
    });

    const sortedIds = Object.keys(grouped).reverse(); 

    sortedIds.forEach(id => {
        const data = grouped[id];
        const typeIcon = data.type === 'skup' ? '<i class="fas fa-cart-arrow-down text-accent"></i>' : '<i class="fas fa-truck-loading text-success"></i>';
        
        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="transaction-header">
                <span style="font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">${typeIcon} ID: ${id}</span>
                <span class="transaction-date" style="font-size: 0.8rem; color: var(--text-secondary);">${data.date}</span>
            </div>
            <div class="transaction-body" style="margin: 15px 0;">
                <div class="transaction-items-list" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">
                    ${data.items.map(item => `<div>- ${item}</div>`).join('')}
                </div>
                <div class="transaction-total" style="font-weight: 900; color: var(--success); font-size: 1.1rem;">Suma: ${data.total}$</div>
            </div>
            <div class="transaction-actions" style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px; text-align: right;">
                <button class="report-error-btn" onclick="openReportModal('${id}')" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 15px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: 0.2s;">
                    <i class="fas fa-exclamation-circle"></i> Zgłoś pomyłkę
                </button>
            </div>
        `;
        div.style.background = "rgba(0,0,0,0.3)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "14px";
        div.style.padding = "15px";
        div.style.marginBottom = "15px";
        
        container.appendChild(div);
    });
    
    if(sortedIds.length === 0) {
         container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Brak zidentyfikowanych transakcji z ID.</p>';
    }
}

function renderBonusesList() {
    const container = document.getElementById('bonuses-list-container');
    container.innerHTML = '';
    
    if (!myBonusesRawData || myBonusesRawData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Brak przyznanych premii w historii.</p>';
        return;
    }

    const sortedBonuses = myBonusesRawData.sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedBonuses.forEach(b => {
        let displayDate = b.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) {
            displayDate = new Date(displayDate).toLocaleString('pl-PL');
        }

        let statusBadge = b.status === 'Odebrane' 
            ? `<span style="background: rgba(34, 197, 94, 0.15); color: var(--success); padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Odebrane</span>`
            : `<span style="background: rgba(245, 158, 11, 0.15); color: var(--warning); padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">Nowe</span>`;

        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="transaction-header" style="justify-content: space-between; display: flex;">
                <span style="font-weight: 800; color: var(--ad-gold); display: flex; align-items: center; gap: 8px;"><i class="fas fa-gift"></i> Od: ${b.boss}</span>
                <span class="transaction-date" style="font-size: 0.8rem; color: var(--text-secondary);">${displayDate}</span>
            </div>
            <div class="transaction-body" style="margin: 15px 0;">
                <div style="font-size: 0.9rem; color: white; margin-bottom: 10px; line-height: 1.5;">
                    ${b.reason || 'Brak notatki'}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="transaction-total" style="font-weight: 900; color: var(--success); font-size: 1.2rem;">+${window.formatMoney(b.amount)}$</div>
                    ${statusBadge}
                </div>
            </div>
        `;
        div.style.background = "rgba(0,0,0,0.3)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "14px";
        div.style.padding = "15px";
        div.style.marginBottom = "15px";
        
        container.appendChild(div);
    });
}

window.closeMyTransactions = function() {
    document.getElementById('my-transactions-modal').classList.remove('active');
    document.getElementById('my-transactions-loader').innerHTML = `
        <i class="fas fa-circle-notch fa-spin fa-3x" style="color: var(--accent-color);"></i>
        <p style="margin-top: 15px; color: var(--text-secondary); font-weight: 600;">Pobieranie historii z bazy...</p>
    `;
}

// ==========================================
// ZGŁASZANIE POMYŁEK
// ==========================================
window.openReportModal = function(receiptId) {
    currentReportReceiptId = receiptId;
    document.getElementById('report-receipt-id').innerText = receiptId;
    document.getElementById('report-reason-input').value = "";
    document.getElementById('report-transaction-modal').classList.add('active');
}

window.closeReportModal = function() {
    document.getElementById('report-transaction-modal').classList.remove('active');
    currentReportReceiptId = "";
}

window.submitTransactionReport = async function() {
    const reason = document.getElementById('report-reason-input').value.trim();
    if (!reason) {
        return showNotice("Podaj powód zgłoszenia!", "warning");
    }

    const btn = document.getElementById('submit-report-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wysyłanie...';

    try {
        const embedPayload = {
            content: "<@303630730528030720>", 
            embeds: [{
                title: "⚠️ Zgłoszenie pomyłki w transakcji!",
                color: 15158332, 
                fields: [
                    { name: "📋 Numer paragonu:", value: `\`${currentReportReceiptId}\``, inline: true },
                    { 
                        name: "👤 Zgłaszający:", 
                        value: `**${currentEmployeeName}**\nSSN: \`${currentEmployeeSsn}\`\nRanga: \`${currentEmployeeRank}\``, 
                        inline: true 
                    },
                    { name: "📝 Powód / Opis błędu:", value: reason, inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "System EL CARTEL PAWN SHOP" }
            }]
        };

        const resDiscord = await fetch(DISCORD_WEBHOOK_URL_SKUP, { 
            method: "POST", 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embedPayload) 
        });

        const resSheet = await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_error_report',
                date: getFormattedDateTime(),
                employee: currentEmployeeName,
                receipt_id: currentReportReceiptId,
                reason: reason
            })
        });

        if (resDiscord.ok && resSheet.ok) {
            showNotice("Zgłoszenie pomyłki zapisane i wysłane na Discord!", "success");
            closeReportModal();
        } else {
            throw new Error("Błąd podczas wysyłania.");
        }
    } catch (e) {
        showNotice("Błąd wysyłania zgłoszenia!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ==========================================
// ZARZĄDZANIE ZGŁOSZENIAMI (ADMIN)
// ==========================================
window.openAdminReports = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");

    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-reports-modal').classList.add('active');
    
    document.getElementById('admin-reports-loader').style.display = 'block';
    document.getElementById('admin-reports-container').innerHTML = '';

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_error_reports&t=${new Date().getTime()}`);
        const data = await response.json();

        const container = document.getElementById('admin-reports-container');
        container.innerHTML = '';
        
        const pendingReports = data.filter(r => r.status === 'Oczekujące').reverse();
        const resolvedReports = data.filter(r => r.status !== 'Oczekujące').reverse().slice(0, 10); 
        
        if (pendingReports.length === 0 && resolvedReports.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); width: 100%;">Brak zgłoszeń w systemie.</p>';
        } else {
            let html = '';
            
            if (pendingReports.length > 0) {
                html += '<h3 style="color: var(--danger); margin-bottom: 10px; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Wymagają uwagi</h3>';
                pendingReports.forEach(r => html += buildAdminReportCard(r));
            }
            
            if (resolvedReports.length > 0) {
                html += '<h3 style="color: var(--success); margin-top: 20px; margin-bottom: 10px; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Ostatnio Rozwiązane</h3>';
                resolvedReports.forEach(r => html += buildAdminReportCard(r));
            }
            
            container.innerHTML = html;
        }
    } catch (e) {
        document.getElementById('admin-reports-container').innerHTML = '<p style="color: var(--danger); text-align: center;">Błąd pobierania danych.</p>';
    } finally {
        document.getElementById('admin-reports-loader').style.display = 'none';
    }
}

function buildAdminReportCard(r) {
    let statusColor = r.status === 'Oczekujące' ? 'var(--warning)' : (r.status === 'Zaakceptowane' ? 'var(--success)' : 'var(--danger)');
    
    let actionsHtml = r.status === 'Oczekujące' ? `
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="updateReportStatus('${r.receipt_id}', 'Odrzucone')" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s;">Odrzuć</button>
            <button onclick="updateReportStatus('${r.receipt_id}', 'Zaakceptowane')" style="background: rgba(34, 197, 94, 0.15); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.3); padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: 0.2s;">Zaakceptuj pomyłkę</button>
        </div>
    ` : '';

    return `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; width: 100%;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 800; color: var(--text-primary);"><i class="fas fa-hashtag"></i> ID: ${r.receipt_id}</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${r.date}</span>
            </div>
            <div style="margin-bottom: 5px; font-size: 0.9rem;"><span style="color: var(--text-secondary);">Zgłasza:</span> <strong style="color: var(--text-primary);">${r.employee}</strong></div>
            <div style="margin-bottom: 15px; font-size: 0.9rem; line-height: 1.4;"><span style="color: var(--text-secondary);">Powód:</span> <span style="color: #fff;">${r.reason}</span></div>
            <div style="font-size: 0.9rem;"><span style="color: var(--text-secondary);">Status:</span> <strong style="color: ${statusColor};">${r.status}</strong></div>
            ${actionsHtml}
        </div>
    `;
}

window.closeAdminReports = function() {
    document.getElementById('admin-reports-modal').classList.remove('active');
}

window.updateReportStatus = async function(receiptId, newStatus) {
    if (!isTravisVance()) return;
    
    try {
        showNotice("Aktualizowanie...", "info");
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_error_report',
                receipt_id: receiptId,
                new_status: newStatus
            })
        });
        showNotice(`Zgłoszenie pomyłki zaktualizowane: ${newStatus}`, "success");
        openAdminReports(); 
    } catch(e) {
        showNotice("Wystąpił błąd podczas aktualizacji!", "danger");
    }
}

// ==========================================
// IDENTYFIKATOR KARTY PROFILU + GAMIFIKACJA
// ==========================================
window.openIdCard = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    
    if (currentEmployeeName) {
        document.getElementById('id-card-name').innerText = currentEmployeeName.toUpperCase();
        document.getElementById('id-card-ssn').innerText = currentEmployeeSsn;
        document.getElementById('id-card-date-zatrudnienia').innerText = currentEmployeeDateZatrudnienia;
        
        const photoContainer = document.querySelector('#id-card-modal .id-photo-box');
        if (currentEmployeePhoto && currentEmployeePhoto !== "") {
            photoContainer.innerHTML = `<img src="${currentEmployeePhoto}" alt="Zdjęcie postaci" class="id-photo-img">`;
        } else {
            photoContainer.innerHTML = `<i class="fas fa-user-tie"></i>`;
        }

        const signatureEl = document.getElementById('id-card-signature');
        if (signatureEl) signatureEl.innerText = currentEmployeeName;

        document.getElementById('id-card-rank-container').innerHTML = `<span class="active-rank">${currentEmployeeRank}</span>`;
        
        // Reset Gamifikacji przed wczytaniem
        document.getElementById('id-card-level-text').innerText = "Analiza danych...";
        document.getElementById('id-card-xp-text').innerText = "Wczytywanie XP...";
        document.getElementById('id-progress-bar-fill').style.width = "0%";
        document.getElementById('id-badges-container').innerHTML = '<i class="fas fa-spinner fa-spin text-secondary"></i> Pobieranie osiągnięć...';
    }
    
    document.getElementById('id-card-modal').classList.add('active');

    // Pobieranie danych do Leveli i Osiągnięć
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        
        const myData = rawData.filter(row => row.employee === currentEmployeeName);
        
        let totalXP = 0;
        let txSet = new Set();
        
        myData.forEach(row => {
            totalXP += row.total;
            if(row.report_id) txSet.add(row.report_id);
        });
        
        let txCount = txSet.size || (myData.length > 0 ? 1 : 0);
        
        renderGamification(totalXP, txCount);
        
    } catch (e) {
        console.error(e);
        document.getElementById('id-card-level-text').innerText = "Błąd pobierania danych";
        document.getElementById('id-card-xp-text').innerText = "Brak połączenia";
        document.getElementById('id-badges-container').innerHTML = '';
    }
}

function renderGamification(totalXP, txCount) {
    const levels = [
        { lvl: 1, max: 50000, name: "Rekrut" },
        { lvl: 2, max: 350000, name: "Znawca" },
        { lvl: 3, max: 500000, name: "Specjalista" },
        { lvl: 4, max: 700000, name: "Ekspert" },
        { lvl: 5, max: 1000000, name: "Weteran" },
        { lvl: 6, max: 2000000, name: "Legenda lombardu" }
    ];
    
    let currentLvl = 1;
    let currentMax = 50000;
    let prevMax = 0;
    
    for (let i = 0; i < levels.length; i++) {
        if (totalXP < levels[i].max) {
            currentLvl = levels[i].lvl;
            currentMax = levels[i].max;
            prevMax = i > 0 ? levels[i-1].max : 0;
            break;
        }
    }
    
    let xpInCurrentLevel = totalXP - prevMax;
    let xpNeededForNextLevel = currentMax - prevMax;
    let progressPercent = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
    if (progressPercent > 100) progressPercent = 100;
    if (currentLvl === 6) progressPercent = 100; 
    
    document.getElementById('id-card-level-text').innerText = `Poziom ${currentLvl} - ${levels[currentLvl-1].name}`;
    
    if (currentLvl === 6) {
        document.getElementById('id-card-xp-text').innerText = `MAX LEVEL (${totalXP.toLocaleString()}$)`;
    } else {
        document.getElementById('id-card-xp-text').innerText = `${totalXP.toLocaleString()}$ / ${currentMax.toLocaleString()}$`;
    }
    
    setTimeout(() => {
        document.getElementById('id-progress-bar-fill').style.width = `${progressPercent}%`;
    }, 100);
    
    // Lista osiągnięć do odblokowania
    const badges = [
        { icon: "fa-tint", name: "Pierwsza krew", desc: "Zrealizowano pierwszą transakcję w systemie.", color: "#ef4444", condition: txCount >= 1 },
        { icon: "fa-handshake", name: "Solidna firma", desc: "Zrealizowano 150 transakcji.", color: "#a855f7", condition: txCount >= 150 },
        { icon: "fa-fish", name: "Rekin biznesu", desc: "Wygenerowano 500,000$ obrotu całkowitego.", color: "#38bdf8", condition: totalXP >= 500000 },
        { icon: "fa-medal", name: "Stary wyga", desc: "Zrealizowano 450 transakcji.", color: "#fbbf24", condition: txCount >= 450 },
        { icon: "fa-crown", name: "Milioner", desc: "Przekroczono barierę 1,000,000$ obrotu. Jesteś elitą.", color: "#eab308", condition: totalXP >= 1000000 }
    ];
    
    const container = document.getElementById('id-badges-container');
    container.innerHTML = '';
    
    badges.forEach(b => {
        const isUnlocked = b.condition;
        const badgeEl = document.createElement('div');
        badgeEl.title = b.desc;
        badgeEl.style.cssText = `
            background: rgba(255,255,255,0.05); 
            border: 1px solid rgba(255,255,255,0.1); 
            padding: 8px 12px; 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            font-size: 0.8rem; 
            font-weight: 600; 
            cursor: help;
            transition: 0.2s;
            opacity: ${isUnlocked ? '1' : '0.4'};
            filter: ${isUnlocked ? 'none' : 'grayscale(100%)'};
        `;
        
        badgeEl.onmouseover = () => badgeEl.style.transform = 'translateY(-2px)';
        badgeEl.onmouseout = () => badgeEl.style.transform = 'translateY(0)';
        
        badgeEl.innerHTML = `<i class="fas ${b.icon}" style="color: ${b.color}; font-size: 1.1rem;"></i> <span style="color: #fff;">${b.name}</span>`;
        container.appendChild(badgeEl);
    });
}

window.closeIdCard = function() {
    document.getElementById('id-card-modal').classList.remove('active');
}

// ==========================================
// FUNKCJE WSPÓLNE I AUTO UPDATE
// ==========================================
window.showNotice = function(msg, type) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        if (serverVersion !== APP_VERSION) {
            if (localStorage.getItem('update_ignored_version') === serverVersion) {
                return;
            }
            showUpdatePrompt(serverVersion);
        }
    } catch (e) {
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
// OBSŁUGA ZDARZEŃ DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) {
        loginPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }

    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.addEventListener('input', applyFilters);

    const finalPriceInput = document.getElementById('final-price-input');
    if(finalPriceInput) {
        finalPriceInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') generateQuote();
        });
    }

    const resetBtnSkup = document.getElementById('reset-btn');
    if(resetBtnSkup) {
        resetBtnSkup.onclick = () => {
            resetCartAndInventory();
            showNotice("Wyczyszczono koszyk!", "warning");
        };
    }

    const searchInputExport = document.getElementById('search-input-export');
    if (searchInputExport) searchInputExport.addEventListener('input', applyFiltersExport);

    const resetBtnExport = document.getElementById('reset-btn-export');
    if (resetBtnExport) {
        resetBtnExport.onclick = () => {
            resetCartAndInventoryExport();
            showNotice("Wyczyszczono listę!", "warning");
        };
    }
});