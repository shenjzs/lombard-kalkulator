const APP_VERSION = "3.7.3";
let LATEST_CHANGELOG_VERSION = APP_VERSION; 

const DISCORD_WEBHOOK_URL_SKUP = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/skup"; 
const DISCORD_WEBHOOK_URL_EXPORT = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/export";
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

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

window.formatMoney = function(amount) {
    if (isNaN(amount)) return "0";
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

function isTravisVance() {
    return currentEmployeeName && currentEmployeeName.trim().toLowerCase() === "travis vance";
}

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
        viewSkup.classList.remove('hidden');
        viewExport.classList.add('hidden');
        navLogoIcon.className = 'fas fa-cash-register';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    } else if (view === 'export') {
        if(themeStyle) themeStyle.href = `style-sprzedaz.css?v=${APP_VERSION}`;
        viewSkup.classList.add('hidden');
        viewExport.classList.remove('hidden');
        navLogoIcon.className = 'fas fa-box-open';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    }
    document.getElementById('user-dropdown').classList.remove('active');
}

window.login = async function() {
    const pin = document.getElementById('employee-login-pin').value;
    const btn = document.getElementById('login-btn-action');
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
            if (adminChangelogBtn) {
                if(isTravisVance()) adminChangelogBtn.classList.remove('hidden');
                else adminChangelogBtn.classList.add('hidden');
            }
            if (adminReportsBtn) {
                if(isTravisVance()) adminReportsBtn.classList.remove('hidden');
                else adminReportsBtn.classList.add('hidden');
            }

            document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
            document.getElementById('dropdown-user-name').innerText = currentEmployeeName;
            document.getElementById('dropdown-user-rank').innerText = currentEmployeeRank;
            
            const navAvatar = document.getElementById('nav-user-avatar');
            const navDefaultIcon = document.getElementById('nav-user-default-icon');
            const dropAvatar = document.getElementById('dropdown-user-avatar');
            const dropDefaultIcon = document.getElementById('dropdown-user-default-icon');

            if (currentEmployeePhoto && currentEmployeePhoto !== "") {
                navAvatar.src = currentEmployeePhoto;
                navAvatar.classList.remove('hidden');
                navDefaultIcon.classList.add('hidden');
                
                dropAvatar.src = currentEmployeePhoto;
                dropAvatar.classList.remove('hidden');
                dropDefaultIcon.classList.add('hidden');
            } else {
                navAvatar.classList.add('hidden');
                navDefaultIcon.classList.remove('hidden');
                
                dropAvatar.classList.add('hidden');
                dropDefaultIcon.classList.remove('hidden');
            }

            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('main-app').classList.remove('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            
            const banner = document.getElementById('announcement-banner');
            if(banner) banner.classList.remove('hidden');

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
    
    if(navAvatar) navAvatar.classList.add('hidden');
    if(navDefaultIcon) navDefaultIcon.classList.remove('hidden');
    if(dropAvatar) dropAvatar.classList.add('hidden');
    if(dropDefaultIcon) dropDefaultIcon.classList.remove('hidden');

    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('user-profile').classList.add('hidden');
    document.getElementById('user-dropdown').classList.remove('active');
    
    const adminChangelogBtn = document.getElementById('admin-changelog-btn');
    const adminReportsBtn = document.getElementById('admin-reports-btn');
    if(adminChangelogBtn) adminChangelogBtn.classList.add('hidden');
    if(adminReportsBtn) adminReportsBtn.classList.add('hidden');
    
    const banner = document.getElementById('announcement-banner');
    if(banner) banner.classList.add('hidden');

    const clContainer = document.getElementById('dynamic-changelog-container');
    if (clContainer) clContainer.innerHTML = '';

    resetCartAndInventory();
    resetCartAndInventoryExport();
    
    showNotice("Zakończono zmianę. Wylogowano.", "info");
}

window.toggleUserMenu = function() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

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
                        <div class="bonus-detail-row">
                            <span class="bonus-detail-from">
                                <strong class="bonus-detail-boss">Od: ${b.boss}</strong><br>
                                <small>${b.reason}</small>
                            </span>
                            <strong class="bonus-detail-amount">+${window.formatMoney(b.amount)}$</strong>
                        </div>
                    `;
                });

                document.getElementById('bonus-notification-details').innerHTML = `
                    <div class="bonus-total-summary">
                        +${window.formatMoney(totalBonus)}$
                    </div>
                    <div class="bonus-list-wrapper">
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
                }).catch(e => console.error("Błąd oznaczania", e));
            }
        }
    } catch (e) {
        console.error("Błąd premii:", e);
    }
}

window.closeBonusNotification = function() {
    document.getElementById('bonus-notification-modal').classList.remove('active');
}

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

function initSkup() {
    document.getElementById('header-date').innerText = getFormattedDate();
    resetCartAndInventory();
    const adInput = document.getElementById('ad-input');
    if(adInput) updateAdPreview();
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
                <div class="item-info custom-inputs-wrapper">
                    <input type="text" class="custom-item-name" data-index="${index}" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}">
                    <input type="number" class="custom-item-price" data-index="${index}" placeholder="Cena $" min="0" value="${item.min > 0 ? item.min : ''}">
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${counts[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
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
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${counts[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
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
    const container = document.getElementById('items-list');
    if(container) {
        const inputs = container.querySelectorAll('.custom-item-name');
        inputs.forEach(input => {
            if(parseInt(input.getAttribute('data-index')) === index) {
                const card = input.closest('.item-card');
                if(card) card.setAttribute('data-name', inventory[index].name.toLowerCase());
            }
        });
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
    const container = document.getElementById('items-list');
    if (container) {
        const input = container.querySelector(`.quantity-input[data-index="${index}"]`);
        if (input) input.value = counts[index];
    }
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
                            <button class="cart-btn-circle minus" data-action="minus" data-index="${index}">-</button>
                            <span class="cart-item-qty">${counts[index]}</span>
                            <button class="cart-btn-circle plus" data-action="add" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${priceText}</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) html = '<div class="empty-cart-msg">Koszyk jest pusty</div>';
    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentMinTotal + '$' + (currentMaxTotal > currentMinTotal ? ` - ${currentMaxTotal}$` : '');
}

window.filterCategory = function(cat, btnElement) {
    currentCategory = cat || 'wszystkie';
    const viewSkup = document.getElementById('view-skup');
    if(viewSkup) {
        viewSkup.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if(btnElement) btnElement.classList.add('active');
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
                if (match) card.classList.remove('hidden');
                else card.classList.add('hidden');
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
    if (isNaN(finalPrice)) return showNotice("Wpisz kwotę transakcji!", "danger");
    if (finalPrice < currentMinTotal) return showNotice(`Kwota zbyt niska! Wymagane: ${currentMinTotal}$.`, "danger");
    if (finalPrice > currentMaxTotal) return showNotice(`Kwota zbyt wysoka! Wymagane: ${currentMaxTotal}$.`, "danger");

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
    if (currentCustomerSSN !== "") employeeText += `<br>KLIENT (SSN): ${currentCustomerSSN}`;
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

window.sendToDiscord = async function() {
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
        if (arrayIndex === activeItems.length - 1) calculatedTotal = remainingAmount;
        else {
            calculatedTotal = Math.round(item.min * count * ratio);
            remainingAmount -= calculatedTotal;
        }
        itemsToLog.push({ name: item.name, qty: count, total: calculatedTotal });
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
            if (currentCustomerSSN !== "") employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSN}**)`;

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
                fetch(REPORTS_API_URL, { method: "POST", body: JSON.stringify(logPayload) }).catch(e => console.error(e));
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
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
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
        if (bar.classList.contains('open')) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        else icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

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
                    <input type="text" class="custom-name-input" data-index="${index}" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}">
                    <input type="number" class="custom-price-input" data-index="${index}" placeholder="Cena $" min="0" value="${item.price > 0 ? item.price : ''}">
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${countsExport[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
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
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${countsExport[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
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

window.updateCountExport = function(index, change) {
    countsExport[index] = Math.max(0, (countsExport[index] || 0) + change);
    const container = document.getElementById('items-list-export');
    if (container) {
        const input = container.querySelector(`.quantity-input[data-index="${index}"]`);
        if (input) input.value = countsExport[index];
    }
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
                            <button class="cart-btn-circle minus" data-action="minus" data-index="${index}">-</button>
                            <span class="cart-item-qty">${countsExport[index]}</span>
                            <button class="cart-btn-circle plus" data-action="add" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${itemTotal}$</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) html = '<div class="empty-cart-msg">Brak dodanych przedmiotów</div>';
    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentTotalExport + '$';
};

window.filterCategoryExport = function(cat, btnElement) {
    currentCategoryExport = cat || 'wszystkie';
    const viewExport = document.getElementById('view-export');
    if(viewExport) {
        viewExport.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if (btnElement) btnElement.classList.add('active');
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
                const match = dataName.includes(term) && (currentCategoryExport === 'wszystkie' || card.getAttribute('data-category') === currentCategoryExport);
                if(match) card.classList.remove('hidden');
                else card.classList.add('hidden');
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
    if (currentCustomerSSNExport !== "") employeeText += `<br>KLIENT (SSN): ${currentCustomerSSNExport}`;

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
            <p class="receipt-meta mt-15">Data wystawienia: ${date}</p>
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
            itemsToLog.push({ name: dName, qty: countsExport[i], total: item.price * countsExport[i] });
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
            if (currentCustomerSSNExport !== "") employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSNExport}**)`;

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
                fetch(REPORTS_API_URL, { method: "POST", body: JSON.stringify(logPayload) }).catch(e => console.error(e));
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
        if (bar.classList.contains('open')) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        else icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

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
                    let displayVersion = v.startsWith('v') ? v.substring(1) : v;
                    
                    grouped[v].items.forEach(itemStr => {
                        let tag = "INFO", desc = itemStr;
                        if(itemStr.includes('|||')) {
                            const parts = itemStr.split('|||');
                            tag = parts[0]; desc = parts[1];
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
                            <div class="admin-controls-layout">
                                <button class="btn-admin-edit" data-action="edit-cl" data-version="${v}" data-items="${safeItems}"><i class="fas fa-edit"></i></button>
                                <button class="btn-admin-del" data-action="delete-cl" data-version="${v}"><i class="fas fa-trash"></i></button>
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
    } catch(e) { console.log(e); checkChangelogNotification(); }
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

window.closeChangelog = function() { document.getElementById('changelog-modal').classList.remove('active'); }

window.openAdminChangelog = function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-changelog-modal').classList.add('active');
    if(document.getElementById('admin-changes-list').children.length === 0) addAdminChangeSlot();
}

window.closeAdminChangelog = function() { document.getElementById('admin-changelog-modal').classList.remove('active'); }

window.addAdminChangeSlot = function() {
    if (!isTravisVance()) return;
    const container = document.getElementById('admin-changes-list');
    const div = document.createElement('div');
    div.className = "admin-change-slot-layout";
    div.innerHTML = `
        <select class="custom-input admin-change-tag admin-change-select"><option value="NOWOŚĆ">NOWOŚĆ</option><option value="POPRAWKA">POPRAWKA</option><option value="USUNIĘTO">USUNIĘTO</option></select>
        <input type="text" class="custom-input admin-change-desc admin-change-input" placeholder="Opis zmiany...">
        <button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
}

window.publishChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    const version = document.getElementById('admin-version-input').value.trim();
    if (!version) return showNotice("Podaj numer wersji!", "warning");
    const rows = document.querySelectorAll('#admin-changes-list > div');
    if (rows.length === 0) return showNotice("Dodaj co najmniej jedną zmianę!", "warning");
    
    let itemsToLog = [], valid = true;
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if (!desc) valid = false;
        itemsToLog.push({ name: `${tag}|||${desc}`, qty: 1, total: 0 });
    });
    
    if (!valid) return showNotice("Wypełnij opisy!", "warning");
    const btn = document.getElementById('publish-changelog-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    try {
        await fetch(REPORTS_API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "save_receipt", type: "changelog", date: getFormattedDateTime(), employee: currentEmployeeName, report_id: "v" + version, items: itemsToLog })
        });
        showNotice("Changelog opublikowany!", "success");
        closeAdminChangelog();
        document.getElementById('admin-version-input').value = "";
        document.getElementById('admin-changes-list').innerHTML = "";
        fetchChangelogData(); 
    } catch(e) { showNotice("Błąd publikacji!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openEditChangelog = function(version, itemsJson) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('changelog-modal').classList.remove('active'); 
    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('edit-cl-original-version').value = version;
    document.getElementById('edit-cl-version-input').value = version.startsWith('v') ? version.substring(1) : version;
    
    const container = document.getElementById('edit-cl-changes-list');
    container.innerHTML = "";
    items.forEach(itemStr => {
        let tag = "INFO", desc = itemStr;
        if(itemStr.includes('|||')) { const parts = itemStr.split('|||'); tag = parts[0]; desc = parts[1]; }
        const div = document.createElement('div');
        div.className = "admin-change-slot-layout";
        div.innerHTML = `
            <select class="custom-input admin-change-tag admin-change-select">
                <option value="NOWOŚĆ" ${tag==='NOWOŚĆ'?'selected':''}>NOWOŚĆ</option>
                <option value="POPRAWKA" ${tag==='POPRAWKA'?'selected':''}>POPRAWKA</option>
                <option value="USUNIĘTO" ${tag==='USUNIĘTO'?'selected':''}>USUNIĘTO</option>
            </select>
            <input type="text" class="custom-input admin-change-desc admin-change-input" value="${desc.replace(/"/g, '&quot;')}">
            <button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>
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
    div.className = "admin-change-slot-layout";
    div.innerHTML = `<select class="custom-input admin-change-tag admin-change-select"><option value="NOWOŚĆ">NOWOŚĆ</option><option value="POPRAWKA">POPRAWKA</option><option value="USUNIĘTO">USUNIĘTO</option></select><input type="text" class="custom-input admin-change-desc admin-change-input" placeholder="Opis zmiany..."><button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
}

window.saveEditedChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    const origVersion = document.getElementById('edit-cl-original-version').value;
    const newVersion = document.getElementById('edit-cl-version-input').value.trim();
    if(!newVersion) return showNotice("Podaj numer wersji!", "warning");
    
    const rows = document.querySelectorAll('#edit-cl-changes-list > div');
    if(rows.length === 0) return showNotice("Podaj chociaż jedną zmianę!", "warning");
    
    let itemsToLog = [], valid = true;
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if(!desc) valid = false;
        itemsToLog.push({ name: `${tag}|||${desc}`, qty: 1, total: 0 });
    });
    
    if(!valid) return showNotice("Wypełnij opisy!", "warning");
    const btn = document.getElementById('save-edit-cl-btn');
    const origHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'edit_changelog', original_version: origVersion, new_version: newVersion.startsWith('v') ? newVersion : 'v' + newVersion, items: itemsToLog, employee: currentEmployeeName, date: getFormattedDateTime() })
        });
        showNotice("Zaktualizowano changelog!", "success");
        closeEditChangelog();
        fetchChangelogData();
    } catch(e) { showNotice("Błąd edycji!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = origHtml; }
}

window.deleteChangelog = async function(version) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    if(!confirm("Na pewno usunąć: " + version + "?")) return;
    try {
        await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete_changelog', version: version }) });
        showNotice("Usunięto " + version + "!", "success");
        fetchChangelogData(); 
    } catch(e) { showNotice("Błąd usuwania!", "danger"); }
}

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
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        const response = await fetch(PIN_API_URL, { method: 'POST', body: JSON.stringify({ action: 'change_pin', old_pin: oldPin, new_pin: newPin, name: currentEmployeeName }) });
        const data = await response.json();
        if (data.success) { showNotice("PIN zmieniony!", "success"); closeSettings(); } 
        else { showNotice(data.message || "Błąd zmiany PINu!", "danger"); }
    } catch (e) { showNotice("Błąd połączenia!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openMyStats = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-stats-modal').classList.add('active');
    document.getElementById('my-stats-loader').classList.remove('hidden');
    document.getElementById('my-stats-content').classList.add('hidden');
    
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        myStatsRawData = (await response.json()).filter(row => row.employee === currentEmployeeName);
        document.getElementById('my-stats-time-filter').value = 'today';
        currentStatsType = currentActiveView === 'export' ? 'sprzedaz' : 'skup';
        currentStatsRange = 'today';
        document.getElementById('btn-stats-skup').classList.toggle('active', currentStatsType === 'skup');
        document.getElementById('btn-stats-sprzedaz').classList.toggle('active', currentStatsType === 'sprzedaz');
        renderMyStatsDisplay();
        document.getElementById('my-stats-loader').classList.add('hidden');
        document.getElementById('my-stats-content').classList.remove('hidden');
    } catch (err) {
        document.getElementById('my-stats-loader').innerHTML = '<p class="text-danger-icon"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
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
    let periodTotal = 0, allTimeTotal = 0, txSet = new Set(), itemCounts = {}, periodItemsQty = 0;
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
        if (currentStatsRange === 'all') isInRange = true;
        else if (currentStatsRange === 'today') { if (rowTime >= startOfToday) isInRange = true; } 
        else if (currentStatsRange === 'yesterday') { if (rowTime >= startOfYesterday && rowTime < startOfToday) isInRange = true; } 
        else if (currentStatsRange === '7days') { if (rowTime >= startOf7Days) isInRange = true; } 
        else if (currentStatsRange === 'month') { if (rowTime >= startOfMonth) isInRange = true; }
        
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
        displayPeriodTotal = Math.max(periodTotal, getDailyStat(currentEmployeeName)); 
    }
    
    let topItem = "Brak", maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
        if (qty > maxQty) { maxQty = qty; topItem = name; }
    }

    let txCount = txSet.size;
    if (txCount === 0 && displayPeriodTotal > 0) txCount = Object.keys(itemCounts).length > 0 ? 1 : 0; 
    let avgTx = txCount > 0 ? Math.round(displayPeriodTotal / txCount) : 0;
    
    document.getElementById('ms-today').innerText = displayPeriodTotal + '$';
    document.getElementById('ms-alltime').innerText = allTimeTotal + '$';
    document.getElementById('ms-count').innerText = txCount;
    document.getElementById('ms-avg').innerText = avgTx + '$';
    document.getElementById('ms-items').innerText = periodItemsQty;
    document.getElementById('ms-topitem').innerText = topItem.length > 15 ? topItem.substring(0, 15) + '...' : topItem;
    const labelEl = document.getElementById('ms-label-items');
    if(labelEl) labelEl.innerText = currentStatsType === 'skup' ? 'Skupione sztuki' : 'Sprzedane sztuki';
    const descEl = document.getElementById('my-stats-desc');
    if (descEl) descEl.innerText = currentStatsType === 'skup' ? 'Podsumowanie Twojej aktywności w firmie (skup).' : 'Podsumowanie Twojej aktywności w firmie (sprzedaż).';
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
    document.getElementById('my-stats-loader').innerHTML = `<i class="fas fa-circle-notch fa-spin fa-3x text-accent-icon"></i><p class="loader-text">Pobieranie danych z bazy...</p>`;
}

window.openMyTransactions = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-transactions-modal').classList.add('active');
    document.getElementById('my-transactions-loader').classList.remove('hidden');
    document.getElementById('my-transactions-content').classList.add('hidden');
    
    try {
        const [reportsRes, bonusesRes] = await Promise.all([ fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`), fetch(`${REPORTS_API_URL}?action=get_bonuses&t=${new Date().getTime()}`) ]);
        myStatsRawData = (await reportsRes.json()).filter(row => row.employee === currentEmployeeName);
        myBonusesRawData = ((await bonusesRes.json()).bonuses || []).filter(b => b.employee === currentEmployeeName);
        switchTransView('historia');
        document.getElementById('my-transactions-loader').classList.add('hidden');
        document.getElementById('my-transactions-content').classList.remove('hidden');
    } catch (err) {
        document.getElementById('my-transactions-loader').innerHTML = '<p class="text-danger-icon"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchTransView = function(view) {
    const btnHist = document.getElementById('btn-trans-historia'), btnPremie = document.getElementById('btn-trans-premie');
    const contHist = document.getElementById('transactions-list-container'), contPremie = document.getElementById('bonuses-list-container');
    const desc = document.getElementById('my-transactions-desc');

    if (view === 'historia') {
        btnHist.classList.add('active'); btnPremie.classList.remove('active');
        contHist.classList.remove('hidden'); contPremie.classList.add('hidden');
        desc.innerText = "Historia Twoich transakcji. Możesz zgłosić pomyłkę w wystawionym paragonie.";
        renderTransactionsList();
    } else {
        btnHist.classList.remove('active'); btnPremie.classList.add('active');
        contHist.classList.add('hidden'); contPremie.classList.remove('hidden');
        desc.innerText = "Historia otrzymanych premii finansowych od zarządu.";
        renderBonusesList();
    }
}

function renderTransactionsList() {
    const container = document.getElementById('transactions-list-container');
    container.innerHTML = '';
    
    if (!myStatsRawData || myStatsRawData.length === 0) {
        container.innerHTML = '<p class="empty-history-msg">Brak transakcji w historii.</p>';
        return;
    }

    const grouped = {};
    myStatsRawData.forEach(row => {
        // Zabezpieczenie: Ignorujemy puste ID oraz wpisy z Changeloga!
        if (!row.report_id || row.type === 'changelog') return;
        
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
                type: row.type || 'nieznany'
            };
        }
        grouped[row.report_id].total += row.total;
        
        // Zabezpieczenie przed "undefined" dla Przetopu Złota, który nie ma wpisanej nazwy przedmiotu
        let itemName = row.name || (row.report_id.includes('GOLD') ? 'Przetop złota' : 'Nieznany przedmiot');
        let itemQty = row.qty || 1;
        
        grouped[row.report_id].items.push(`${itemName} (x${itemQty}) - ${row.total}$`);
    });

    const sortedIds = Object.keys(grouped).reverse(); 

    sortedIds.forEach(id => {
        const data = grouped[id];
        
        // Dynamiczne dobieranie ikon (Skup / Export / Przetop Złota)
        let typeIcon = '';
        if (data.type === 'skup') typeIcon = '<i class="fas fa-cart-arrow-down text-accent"></i>';
        else if (data.type === 'sprzedaz') typeIcon = '<i class="fas fa-truck-loading text-success"></i>';
        else if (id.includes('GOLD')) typeIcon = '<i class="fa-solid fa-temperature-half text-warning"></i>';
        else typeIcon = '<i class="fas fa-receipt text-secondary"></i>';
        
        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="admin-report-header">
                <span class="transaction-header-type">${typeIcon} ID: ${id}</span>
                <span class="transaction-date">${data.date}</span>
            </div>
            <div class="transaction-body-layout">
                <div class="transaction-items-list">
                    ${data.items.map(item => `<div>- ${item}</div>`).join('')}
                </div>
                <div class="transaction-total-amount">Suma: ${data.total}$</div>
            </div>
            <div class="transaction-actions-layout">
                <button class="report-error-btn" data-action="report-error" data-id="${id}">
                    <i class="fas fa-exclamation-circle"></i> Zgłoś pomyłkę
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    
    if(sortedIds.length === 0) {
         container.innerHTML = '<p class="empty-history-msg">Brak zidentyfikowanych transakcji z ID.</p>';
    }
}

function renderBonusesList() {
    const container = document.getElementById('bonuses-list-container');
    container.innerHTML = '';
    
    if (!myBonusesRawData || myBonusesRawData.length === 0) {
        container.innerHTML = '<p class="empty-history-msg">Brak przyznanych premii w historii.</p>';
        return;
    }

    const sortedBonuses = myBonusesRawData.sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedBonuses.forEach(b => {
        let displayDate = b.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) displayDate = new Date(displayDate).toLocaleString('pl-PL');
        let statusBadge = b.status === 'Odebrane' ? `<span class="status-badge-received">Odebrane</span>` : `<span class="status-badge-new">Nowe</span>`;
        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="admin-report-header"><span class="transaction-header-type gold"><i class="fas fa-gift"></i> Od: ${b.boss}</span><span class="transaction-date">${displayDate}</span></div>
            <div class="transaction-body-layout">
                <div class="bonus-item-desc">${b.reason || 'Brak notatki'}</div>
                <div class="flex-between-center"><div class="transaction-total-amount lg">+${window.formatMoney(b.amount)}$</div>${statusBadge}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.closeMyTransactions = function() {
    document.getElementById('my-transactions-modal').classList.remove('active');
    document.getElementById('my-transactions-loader').innerHTML = `<i class="fas fa-circle-notch fa-spin fa-3x text-accent-icon"></i><p class="loader-text">Pobieranie historii z bazy...</p>`;
}

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
    if (!reason) return showNotice("Podaj powód zgłoszenia!", "warning");

    const btn = document.getElementById('submit-report-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wysyłanie...';

    try {
        const embedPayload = {
            content: "<@303630730528030720>", 
            embeds: [{
                title: "⚠️ Zgłoszenie pomyłki w transakcji!", color: 15158332, 
                fields: [
                    { name: "📋 Numer paragonu:", value: `\`${currentReportReceiptId}\``, inline: true },
                    { name: "👤 Zgłaszający:", value: `**${currentEmployeeName}**\nSSN: \`${currentEmployeeSsn}\`\nRanga: \`${currentEmployeeRank}\``, inline: true },
                    { name: "📝 Powód / Opis błędu:", value: reason, inline: false }
                ],
                timestamp: new Date().toISOString(), footer: { text: "System EL CARTEL PAWN SHOP" }
            }]
        };

        const resDiscord = await fetch(DISCORD_WEBHOOK_URL_SKUP, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(embedPayload) });
        const resSheet = await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'save_error_report', date: getFormattedDateTime(), employee: currentEmployeeName, receipt_id: currentReportReceiptId, reason: reason }) });

        if (resDiscord.ok && resSheet.ok) {
            showNotice("Zgłoszenie wysłane na Discord!", "success");
            closeReportModal();
        } else throw new Error("Błąd.");
    } catch (e) { showNotice("Błąd wysyłania!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openAdminReports = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-reports-modal').classList.add('active');
    document.getElementById('admin-reports-loader').classList.remove('hidden');
    document.getElementById('admin-reports-container').innerHTML = '';

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_error_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        const container = document.getElementById('admin-reports-container');
        container.innerHTML = '';
        
        const pendingReports = data.filter(r => r.status === 'Oczekujące').reverse();
        const resolvedReports = data.filter(r => r.status !== 'Oczekujące').reverse().slice(0, 10); 
        
        if (pendingReports.length === 0 && resolvedReports.length === 0) {
            container.innerHTML = '<p class="empty-history-msg">Brak zgłoszeń.</p>';
        } else {
            let html = '';
            if (pendingReports.length > 0) {
                html += '<h3 class="admin-report-title-warning">Wymagają uwagi</h3>';
                pendingReports.forEach(r => html += buildAdminReportCard(r));
            }
            if (resolvedReports.length > 0) {
                html += '<h3 class="admin-report-title-success">Ostatnio Rozwiązane</h3>';
                resolvedReports.forEach(r => html += buildAdminReportCard(r));
            }
            container.innerHTML = html;
        }
    } catch (e) { document.getElementById('admin-reports-container').innerHTML = '<p class="text-danger-icon" style="text-align:center;">Błąd.</p>'; } 
    finally { document.getElementById('admin-reports-loader').classList.add('hidden'); }
}

function buildAdminReportCard(r) {
    let statusColor = r.status === 'Oczekujące' ? 'var(--warning)' : (r.status === 'Zaakceptowane' ? 'var(--success)' : 'var(--danger)');
    let actionsHtml = r.status === 'Oczekujące' ? `<div class="admin-report-actions"><button class="btn-reject" data-action="admin-status" data-id="${r.receipt_id}" data-status="Odrzucone">Odrzuć</button><button class="btn-accept" data-action="admin-status" data-id="${r.receipt_id}" data-status="Zaakceptowane">Zaakceptuj pomyłkę</button></div>` : '';
    return `<div class="admin-report-card"><div class="admin-report-header"><span class="admin-report-id"><i class="fas fa-hashtag"></i> ID: ${r.receipt_id}</span><span class="admin-report-date">${r.date}</span></div><div class="admin-report-emp"><span class="text-secondary">Zgłasza:</span> <strong class="text-primary">${r.employee}</strong></div><div class="admin-report-reason"><span class="text-secondary">Powód:</span> <span class="text-white-inline">${r.reason}</span></div><div class="admin-report-status"><span class="text-secondary">Status:</span> <strong style="color: ${statusColor};">${r.status}</strong></div>${actionsHtml}</div>`;
}

window.closeAdminReports = function() { document.getElementById('admin-reports-modal').classList.remove('active'); }

window.updateReportStatus = async function(receiptId, newStatus) {
    if (!isTravisVance()) return;
    try {
        showNotice("Aktualizowanie...", "info");
        await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'update_error_report', receipt_id: receiptId, new_status: newStatus }) });
        showNotice(`Zgłoszenie zaktualizowane: ${newStatus}`, "success");
        openAdminReports(); 
    } catch(e) { showNotice("Wystąpił błąd podczas aktualizacji!", "danger"); }
}

window.openIdCard = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    
    if (currentEmployeeName) {
        document.getElementById('id-card-name').innerText = currentEmployeeName.toUpperCase();
        document.getElementById('id-card-ssn').innerText = currentEmployeeSsn;
        document.getElementById('id-card-date-zatrudnienia').innerText = currentEmployeeDateZatrudnienia;
        const photoContainer = document.getElementById('id-card-photo-container');
        if (currentEmployeePhoto && currentEmployeePhoto !== "") photoContainer.innerHTML = `<img src="${currentEmployeePhoto}" alt="Zdjęcie postaci" class="id-photo-img">`;
        else photoContainer.innerHTML = `<i class="fas fa-user-tie"></i>`;
        document.getElementById('id-card-signature').innerText = currentEmployeeName;
        document.getElementById('id-card-rank-container').innerHTML = `<span class="active-rank">${currentEmployeeRank}</span>`;
        document.getElementById('id-card-level-text').innerText = "Analiza danych...";
        document.getElementById('id-card-xp-text').innerText = "Wczytywanie XP...";
        document.getElementById('id-progress-bar-fill').style.width = "0%";
        document.getElementById('id-badges-container').innerHTML = '<i class="fas fa-spinner fa-spin text-secondary"></i> Pobieranie osiągnięć...';
    }
    
    document.getElementById('id-card-modal').classList.add('active');

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        const myData = rawData.filter(row => row.employee === currentEmployeeName);
        let totalXP = 0; let txSet = new Set();
        myData.forEach(row => { totalXP += row.total; if(row.report_id) txSet.add(row.report_id); });
        let txCount = txSet.size || (myData.length > 0 ? 1 : 0);
        renderGamification(totalXP, txCount);
    } catch (e) {
        document.getElementById('id-card-level-text').innerText = "Błąd pobierania danych";
        document.getElementById('id-card-xp-text').innerText = "Brak połączenia";
        document.getElementById('id-badges-container').innerHTML = '';
    }
}

function renderGamification(totalXP, txCount) {
    const levels = [
        { lvl: 1, max: 50000, name: "Rekrut" }, { lvl: 2, max: 350000, name: "Znawca" }, { lvl: 3, max: 500000, name: "Specjalista" },
        { lvl: 4, max: 700000, name: "Ekspert" }, { lvl: 5, max: 1000000, name: "Weteran" }, { lvl: 6, max: 2000000, name: "Legenda lombardu" }
    ];
    let currentLvl = 1, currentMax = 50000, prevMax = 0;
    for (let i = 0; i < levels.length; i++) {
        if (totalXP < levels[i].max) { currentLvl = levels[i].lvl; currentMax = levels[i].max; prevMax = i > 0 ? levels[i-1].max : 0; break; }
    }
    let progressPercent = ((totalXP - prevMax) / (currentMax - prevMax)) * 100;
    if (progressPercent > 100 || currentLvl === 6) progressPercent = 100; 
    
    document.getElementById('id-card-level-text').innerText = `Poziom ${currentLvl} - ${levels[currentLvl-1].name}`;
    document.getElementById('id-card-xp-text').innerText = currentLvl === 6 ? `MAX LEVEL (${totalXP.toLocaleString()}$)` : `${totalXP.toLocaleString()}$ / ${currentMax.toLocaleString()}$`;
    setTimeout(() => { document.getElementById('id-progress-bar-fill').style.width = `${progressPercent}%`; }, 100);
    
    const badges = [
        { icon: "fa-tint", name: "Pierwsza krew", color: "#ef4444", condition: txCount >= 1 },
        { icon: "fa-handshake", name: "Solidna firma", color: "#a855f7", condition: txCount >= 150 },
        { icon: "fa-fish", name: "Rekin biznesu", color: "#38bdf8", condition: totalXP >= 500000 },
        { icon: "fa-medal", name: "Stary wyga", color: "#fbbf24", condition: txCount >= 450 },
        { icon: "fa-crown", name: "Milioner", color: "#eab308", condition: totalXP >= 1000000 }
    ];
    
    const container = document.getElementById('id-badges-container');
    container.innerHTML = '';
    badges.forEach(b => {
        const badgeEl = document.createElement('div');
        badgeEl.className = `gamification-badge ${b.condition ? 'badge-unlocked' : 'badge-locked'}`;
        badgeEl.innerHTML = `<i class="fas ${b.icon}" style="color: ${b.color}; font-size: 1.1rem;"></i> <span class="text-white-inline">${b.name}</span>`;
        container.appendChild(badgeEl);
    });
}

window.closeIdCard = function() { document.getElementById('id-card-modal').classList.remove('active'); }

window.showNotice = function(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        if (serverVersion !== APP_VERSION) {
            if (localStorage.getItem('update_ignored_version') === serverVersion) return;
            showUpdatePrompt(serverVersion);
        }
    } catch (e) {}
}

function showUpdatePrompt(serverVersion) {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt'; div.className = 'update-notify';
    div.innerHTML = `<span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję!</span><button class="update-btn-refresh" onclick="forceHardReload('${serverVersion}')">Odśwież</button>`;
    document.body.appendChild(div);
}

window.forceHardReload = async function(serverVersion) {
    if (serverVersion) localStorage.setItem('update_ignored_version', serverVersion);
    if ('serviceWorker' in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); for (let reg of registrations) await reg.unregister(); }
    if ('caches' in window) { const cacheNames = await caches.keys(); for (let name of cacheNames) await caches.delete(name); }
    window.location.href = window.location.pathname + '?refresh=' + new Date().getTime();
};

setInterval(checkUpdates, 60000);
setTimeout(checkUpdates, 3000);

document.addEventListener('DOMContentLoaded', () => {
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) loginPinInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') login(); });

    document.getElementById('nav-skup-btn')?.addEventListener('click', (e) => { e.preventDefault(); switchView('skup'); });
    document.getElementById('nav-export-btn')?.addEventListener('click', (e) => { e.preventDefault(); switchView('export'); });

    document.getElementById('profile-toggle-btn')?.addEventListener('click', toggleUserMenu);
    document.getElementById('menu-id-card')?.addEventListener('click', openIdCard);
    document.getElementById('menu-my-stats')?.addEventListener('click', openMyStats);
    document.getElementById('menu-my-trans')?.addEventListener('click', openMyTransactions);
    document.getElementById('menu-changelog')?.addEventListener('click', openChangelog);
    document.getElementById('admin-changelog-btn')?.addEventListener('click', openAdminChangelog);
    document.getElementById('admin-reports-btn')?.addEventListener('click', openAdminReports);
    document.getElementById('menu-settings')?.addEventListener('click', openSettings);
    document.getElementById('menu-logout')?.addEventListener('click', logout);
    document.getElementById('login-btn-action')?.addEventListener('click', login);

    document.getElementById('search-input')?.addEventListener('input', applyFilters);
    document.getElementById('search-input-export')?.addEventListener('input', applyFiltersExport);

    document.querySelectorAll('#skup-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterCategory(e.currentTarget.dataset.category, e.currentTarget));
    });

    document.querySelectorAll('#export-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterCategoryExport(e.currentTarget.dataset.category, e.currentTarget));
    });

    document.getElementById('ad-input')?.addEventListener('input', updateAdPreview);
    document.getElementById('copy-ad-btn-action')?.addEventListener('click', copyAd);

    document.querySelectorAll('#ad-tags-container .tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => insertTag(e.currentTarget.dataset.tag));
    });

    document.getElementById('add-custom-slot-btn')?.addEventListener('click', addCustomItemSlot);
    document.getElementById('add-custom-slot-btn-export')?.addEventListener('click', addCustomItemSlotExport);
    
    document.getElementById('mobile-toggle-btn')?.addEventListener('click', toggleSummary);
    document.getElementById('summary-toggle-export')?.addEventListener('click', toggleSummaryExport);
    
    document.getElementById('cart-toggle-btn')?.addEventListener('click', toggleCart);
    document.getElementById('cart-toggle-btn-export')?.addEventListener('click', toggleCartExport);
    
    document.getElementById('quote-btn')?.addEventListener('click', generateQuote);
    document.getElementById('quote-btn-export')?.addEventListener('click', generateQuoteExport);

    const finalPriceInput = document.getElementById('final-price-input');
    if(finalPriceInput) finalPriceInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') generateQuote(); });

    document.getElementById('reset-btn')?.addEventListener('click', () => { resetCartAndInventory(); showNotice("Wyczyszczono koszyk!", "warning"); });
    document.getElementById('reset-btn-export')?.addEventListener('click', () => { resetCartAndInventoryExport(); showNotice("Wyczyszczono listę!", "warning"); });

    document.getElementById('close-cart-btn')?.addEventListener('click', toggleCart);
    document.getElementById('close-cart-btn-export')?.addEventListener('click', toggleCartExport);
    
    document.getElementById('close-quote-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('send-discord-btn')?.addEventListener('click', sendToDiscord);
    document.getElementById('copy-receipt-btn')?.addEventListener('click', copyReceiptToClipboard);

    document.getElementById('close-quote-modal-export-btn')?.addEventListener('click', closeModalExport);
    document.getElementById('close-quote-modal-export-btn-2')?.addEventListener('click', closeModalExport);
    document.getElementById('send-discord-btn-export')?.addEventListener('click', sendToDiscordExport);

    document.getElementById('close-settings-modal-btn')?.addEventListener('click', closeSettings);
    document.getElementById('change-pin-btn')?.addEventListener('click', changeEmployeePin);

    document.getElementById('close-my-stats-btn')?.addEventListener('click', closeMyStats);
    document.getElementById('my-stats-time-filter')?.addEventListener('change', (e) => changeStatsTimeRange(e.target.value));

    document.querySelectorAll('#stats-view-toggles .my-stats-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchStatsView(e.currentTarget.dataset.view));
    });

    document.getElementById('close-my-transactions-btn')?.addEventListener('click', closeMyTransactions);
    document.querySelectorAll('#trans-view-toggles .my-stats-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTransView(e.currentTarget.dataset.view));
    });

    document.getElementById('close-report-modal-btn')?.addEventListener('click', closeReportModal);
    document.getElementById('submit-report-btn')?.addEventListener('click', submitTransactionReport);

    document.getElementById('close-admin-reports-btn')?.addEventListener('click', closeAdminReports);
    
    document.getElementById('close-changelog-modal-btn')?.addEventListener('click', closeChangelog);
    document.getElementById('close-admin-changelog-btn')?.addEventListener('click', closeAdminChangelog);
    document.getElementById('add-admin-change-slot-btn')?.addEventListener('click', addAdminChangeSlot);
    document.getElementById('publish-changelog-btn')?.addEventListener('click', publishChangelog);

    document.getElementById('close-edit-changelog-btn')?.addEventListener('click', closeEditChangelog);
    document.getElementById('add-edit-change-slot-btn')?.addEventListener('click', addEditChangeSlot);
    document.getElementById('save-edit-cl-btn')?.addEventListener('click', saveEditedChangelog);
    
    document.getElementById('close-id-card-btn')?.addEventListener('click', closeIdCard);
    document.getElementById('close-bonus-notification-btn')?.addEventListener('click', closeBonusNotification);
    document.getElementById('claim-bonus-notification-btn')?.addEventListener('click', closeBonusNotification);

    const handleListClick = (e, listType) => {
        const btn = e.target.closest('.btn-circle');
        if (btn) {
            const index = parseInt(btn.getAttribute('data-index'));
            const action = btn.getAttribute('data-action');
            if (action === 'add') {
                if(listType === 'skup') updateCount(index, 1);
                else updateCountExport(index, 1);
            } else if (action === 'minus') {
                if(listType === 'skup') updateCount(index, -1);
                else updateCountExport(index, -1);
            }
        }
    };

    document.getElementById('items-list')?.addEventListener('click', (e) => handleListClick(e, 'skup'));
    document.getElementById('items-list-export')?.addEventListener('click', (e) => handleListClick(e, 'export'));

    const handleListInput = (e, listType) => {
        if(e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') handleInput(index, e.target.value);
            else handleInputExport(index, e.target.value);
        } else if (e.target.classList.contains('custom-item-name') || e.target.classList.contains('custom-name-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') updateCustomName(index, e.target.value);
            else updateCustomNameExport(index, e.target.value);
        } else if (e.target.classList.contains('custom-item-price') || e.target.classList.contains('custom-price-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') updateCustomPrice(index, e.target.value);
            else updateCustomPriceExport(index, e.target.value);
        }
    };

    document.getElementById('items-list')?.addEventListener('input', (e) => handleListInput(e, 'skup'));
    document.getElementById('items-list-export')?.addEventListener('input', (e) => handleListInput(e, 'export'));

    const handleAdminSlotRemove = (e) => {
        const btn = e.target.closest('.btn-delete-slot');
        if (btn) btn.closest('.admin-change-slot-layout').remove();
    };
    
    document.getElementById('admin-changes-list')?.addEventListener('click', handleAdminSlotRemove);
    document.getElementById('edit-cl-changes-list')?.addEventListener('click', handleAdminSlotRemove);

    document.getElementById('dynamic-changelog-container')?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-admin-edit');
        if(btnEdit) openEditChangelog(btnEdit.getAttribute('data-version'), btnEdit.getAttribute('data-items'));
        const btnDel = e.target.closest('.btn-admin-del');
        if(btnDel) deleteChangelog(btnDel.getAttribute('data-version'));
    });

    document.getElementById('transactions-list-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.report-error-btn');
        if(btn) openReportModal(btn.getAttribute('data-id'));
    });

    document.getElementById('admin-reports-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="admin-status"]');
        if(btn) updateReportStatus(btn.getAttribute('data-id'), btn.getAttribute('data-status'));
    });
});