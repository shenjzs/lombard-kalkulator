// ==========================================
// WERSJA APLIKACJI
// ==========================================
const APP_VERSION = "3.2.3";

// ==========================================
// KONFIGURACJA
// ==========================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500540604827046078/_uzuOq6EK9Ip0XggKscXNsmPRZrl4EdmBSLcWcMRaavI0wimpqkxWIRn8TrELISJ6RZQ"; 
// Baza PIN:
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
// Baza Raportów:
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

// Główna, domyślna baza przedmiotów
const defaultInventory = [
    { name: "Zdobiona książka", min: 120, max: 120, category: "inne" },
    { name: "Dywan", min: 240, max: 240, category: "dom" },
    { name: "Komputer (laptop)", min: 600, max: 600, category: "elektronika" },
    { name: "Komputer (stacjonarny)", min: 680, max: 680, category: "elektronika" },
    { name: "Konsola", min: 400, max: 400, category: "elektronika" },
    { name: "Konsola DJ", min: 640, max: 640, category: "elektronika" },
    { name: "Kobieca plastikowa figurka", min: 90, max: 90, category: "inne" },
    { name: "Plastikowa figurka małpki", min: 80, max: 80, category: "inne" },
    { name: "Kwiat", min: 60, max: 60, category: "dom" },
    { name: "Gitara elektryczna", min: 480, max: 480, category: "elektronika" },
    { name: "Dziwna substancja", min: 90, max: 90, category: "inne" },
    { name: "Dziwna szara substancja", min: 160, max: 160, category: "inne" },
    { name: "Biżuteria", min: 240, max: 240, category: "biżuteria" },
    { name: "Brudna biżuteria", min: 150, max: 150, category: "biżuteria" },
    { name: "Katana", min: 480, max: 480, category: "inne" },
    { name: "Mikrofala", min: 280, max: 280, category: "dom" },
    { name: "Mikser", min: 160, max: 160, category: "dom" },
    { name: "Monitor", min: 140, max: 140, category: "elektronika" },
    { name: "Obraz", min: 110, max: 110, category: "dom" },
    { name: "Obraz ścienny", min: 175, max: 175, category: "dom" },
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
let currentEmployeeName = ""; 
let currentCustomerSSN = ""; 
// BLOKADA PODWÓJNEGO NALICZANIA UTARGU
let isStatAddedForCurrentReceipt = false;

// Do statystyk globalnych pracownika
let myStatsRawData = [];

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

function generateID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = 'EC-';
    for(let i=0; i<8; i++) res += chars[Math.floor(Math.random()*chars.length)];
    return res;
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
            
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-profile').style.display = 'block';
            
            const banner = document.getElementById('announcement-banner');
            if(banner) banner.style.display = 'flex';

            showNotice(`Rozpoczęto zmianę: ${data.name}`, "success");
            
            init();
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
    document.getElementById('employee-login-pin').value = "";
    document.getElementById('logged-user-name').innerText = "---";
    document.getElementById('login-screen').classList.add('active');
    
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('user-dropdown').classList.remove('active');
    
    const banner = document.getElementById('announcement-banner');
    if(banner) banner.style.display = 'none';

    resetCartAndInventory();
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

// STATYSTYKI PRACOWNIKA (Lokale Storage - tylko w tle do zliczania live)
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

function resetCartAndInventory() {
    inventory = JSON.parse(JSON.stringify(defaultInventory));
    counts = {};
    
    inventory.forEach((_, index) => { counts[index] = 0; });

    const finalPriceInput = document.getElementById('final-price-input');
    if (finalPriceInput) finalPriceInput.value = "";
    
    const ssnInput = document.getElementById('customer-ssn-input');
    if (ssnInput) ssnInput.value = "";

    renderInventory();
    calculateTotal();
}

function renderInventory() {
    const list = document.getElementById('items-list');
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

function init() {
    document.getElementById('header-date').innerText = getFormattedDate();
    resetCartAndInventory();
    
    document.getElementById('ad-input').addEventListener('input', updateAdPreview);
    updateAdPreview();
    updateCartView(); 
}

window.toggleWidget = function() {
    const widget = document.getElementById('dynamic-price-widget');
    const icon = document.getElementById('widget-toggle-icon');
    if (widget && icon) {
        widget.classList.toggle('collapsed');
        if (widget.classList.contains('collapsed')) {
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        } else {
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        }
    }
}

window.addCustomItemSlot = function() {
    const index = inventory.length;
    inventory.push({ name: "Własny przedmiot", min: 0, max: 0, category: "inne", isCustom: true });
    counts[index] = 0;

    renderInventory();
    showNotice("Dodano nowe pole na własny przedmiot!", "success");
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
    document.getElementById('total-price').innerText = min + '$';
    
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
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase();
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
        document.querySelectorAll('.item-card').forEach(card => {
            const name = card.getAttribute('data-name') || '';
            const cat = card.getAttribute('data-category') || '';
            const match = name.includes(term) && (currentCategory === 'wszystkie' || cat === currentCategory);
            card.classList.toggle('hidden', !match);
        });
    }
}

window.generateQuote = async function() {
    const hasItems = Object.values(counts).some(c => c > 0);
    const finalPriceInput = document.getElementById('final-price-input');
    const finalPrice = parseFloat(finalPriceInput.value);
    const ssnInput = document.getElementById('customer-ssn-input');
    currentCustomerSSN = ssnInput ? ssnInput.value.trim() : "";

    if (!hasItems) return showNotice("Koszyk jest pusty!", "warning");
    
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
    document.getElementById('current-receipt-date').innerText = getFormattedDate();
    document.getElementById('receipt-id-display').innerText = `NR: ${receiptID}`;
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSN !== "") {
        employeeText += `<br>KLIENT [SSN]: ${currentCustomerSSN}`;
    }
    document.getElementById('receipt-employee-display').innerHTML = employeeText;
    
    document.getElementById('receipt-total').innerText = finalPrice + '$';

    const itemsDiv = document.getElementById('receipt-items');
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

    document.getElementById('quote-modal').classList.add('active');
}

async function sendToDiscord() {
    const btn = document.getElementById('send-discord-btn');
    const area = document.getElementById('receipt-capture-area');
    
    const receiptID = document.getElementById('receipt-id-display').innerText.replace('NR: ', '');
    const employee = currentEmployeeName; 
    const finalPriceText = document.getElementById('receipt-total').innerText;
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
            
            const res = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", body: formData });
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
    const s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.substring(0, s) + tag + area.value.substring(e);
    updateAdPreview();
}

window.copyAd = function() {
    navigator.clipboard.writeText(document.getElementById('ad-input').value);
    showNotice("Skopiowano reklamę!", "success");
}

window.closeModal = function() { 
    document.getElementById('quote-modal').classList.remove('active'); 
}

window.showNotice = function(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

document.getElementById('reset-btn').onclick = () => {
    resetCartAndInventory();
    showNotice("Wyczyszczono koszyk!", "warning");
};

document.addEventListener('DOMContentLoaded', () => {
    
    const sendBtn = document.getElementById('send-discord-btn');
    if(sendBtn) sendBtn.onclick = sendToDiscord;
    
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.addEventListener('input', applyFilters);

    const triggerGenerateQuote = function(e) {
        if (e.key === 'Enter') generateQuote();
    };
    
    const finalPriceInput = document.getElementById('final-price-input');
    if(finalPriceInput) finalPriceInput.addEventListener('keypress', triggerGenerateQuote);

    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) {
        loginPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
});

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
        console.error(e);
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
        
        // Odpalamy domyślnie widok SKUP
        switchStatsView('skup');
        
        document.getElementById('my-stats-loader').classList.add('hidden');
        document.getElementById('my-stats-content').classList.remove('hidden');
        
    } catch (err) {
        console.error(err);
        document.getElementById('my-stats-loader').innerHTML = '<p style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchStatsView = function(type) {
    // Stylizacja przycisków
    document.getElementById('btn-stats-skup').classList.toggle('active', type === 'skup');
    document.getElementById('btn-stats-sprzedaz').classList.toggle('active', type === 'sprzedaz');

    // Filtrujemy dane wg wybranego typu (skup / sprzedaz)
    const typeData = myStatsRawData.filter(row => row.type === type);
    
    let allTimeTotal = 0;
    let todayTotal = 0;
    let txSet = new Set();
    let itemCounts = {};
    let totalItemsQty = 0;
    
    const todayStr = getFormattedDate(); 
    
    typeData.forEach(row => {
        allTimeTotal += row.total;
        totalItemsQty += row.qty;
        
        let isToday = false;
        let rowDateStr = String(row.date);
        
        if (rowDateStr.includes(todayStr) || rowDateStr.startsWith(todayStr)) {
            isToday = true;
        } else {
            try {
                const d = new Date(row.date);
                if (!isNaN(d)) {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    if (`${day}.${month}.${year}` === todayStr) isToday = true;
                }
            } catch(e){}
        }
        
        if (isToday) todayTotal += row.total;
        if (row.report_id) txSet.add(row.report_id);
        if (!itemCounts[row.name]) itemCounts[row.name] = 0;
        itemCounts[row.name] += row.qty;
    });
    
    // Obliczanie "Dzisiejszego obrotu"
    let displayToday = todayTotal;
    if (type === 'skup') {
        let localToday = getDailyStat(currentEmployeeName);
        displayToday = Math.max(todayTotal, localToday); 
    }
    
    // Szukanie TOP Przedmiotu
    let topItem = "Brak";
    let maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
        if (qty > maxQty) {
            maxQty = qty;
            topItem = name;
        }
    }

    let txCount = txSet.size > 0 ? txSet.size : typeData.length;
    let avgTx = txCount > 0 ? Math.round(allTimeTotal / txCount) : 0;
    
    document.getElementById('ms-today').innerText = displayToday + '$';
    document.getElementById('ms-alltime').innerText = allTimeTotal + '$';
    document.getElementById('ms-count').innerText = txCount;
    document.getElementById('ms-avg').innerText = avgTx + '$';
    document.getElementById('ms-items').innerText = totalItemsQty;
    
    if (topItem.length > 15) topItem = topItem.substring(0, 15) + '...';
    document.getElementById('ms-topitem').innerText = topItem;

    // Dynamiczna zmiana etykiet i opisów
    const labelEl = document.getElementById('ms-label-items');
    if (labelEl) {
        labelEl.innerText = type === 'skup' ? 'Skupione sztuki' : 'Sprzedane sztuki';
    }
    const descEl = document.getElementById('my-stats-desc');
    if (descEl) {
        descEl.innerText = type === 'skup' ? 'Podsumowanie Twojej aktywności w firmie (skup).' : 'Podsumowanie Twojej aktywności w firmie (sprzedaż).';
    }
}

window.closeMyStats = function() {
    document.getElementById('my-stats-modal').classList.remove('active');
    document.getElementById('my-stats-loader').innerHTML = `
        <i class="fas fa-circle-notch fa-spin fa-3x" style="color: var(--accent-color);"></i>
        <p style="margin-top: 15px; color: var(--text-secondary); font-weight: 600;">Pobieranie danych z bazy...</p>
    `;
}