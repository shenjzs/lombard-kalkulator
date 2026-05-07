const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500573620605550725/VmpdLB3qN1FT6Jkf-U-Wo1cig-WEpVjleki4f-EA45G5QfSuBJeC3f1fqCKB_LTeXOQ5"; 

// Baza PIN (stary arkusz):
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec"; 

// Baza Raportów (nowy arkusz - EL CARTEL - BAZA RAPORTÓW):
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
    { name: "Stary popsuty telefon", price: 110, category: "elektronika" }
];

let counts = {};
let currentCategory = 'wszystkie';
let currentTotal = 0;
let lastGeneratedReportID = ""; 
let currentEmployeeName = ""; 

function getFormattedDate() {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

function init() {
    const list = document.getElementById('items-list');
    if (!list) return;
    
    document.getElementById('header-date').innerText = getFormattedDate();
    
    inventory.forEach((item, index) => {
        counts[index] = 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        card.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">Skup: ${item.price}$</span>
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

// LOGIKA WŁASNEGO PRZEDMIOTU (ZGODNIE ZE SCREENAMI)
window.addCustomItemSlot = function() {
    const list = document.getElementById('items-list');
    const index = inventory.length; 
    
    inventory.push({ name: "", price: 0, category: "custom", isCustom: true });
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

// LOGIKA OTWIERANIA I ZAMYKANIA KOSZYKA
window.toggleCart = function() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

// LOGIKA AKTUALIZACJI ZAWARTOŚCI KOSZYKA
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

// LOGIKA WERYFIKACJI PIN BEZPOŚREDNIO Z PASKA
window.generateQuote = async function() {
    if (!Object.values(counts).some(c => c > 0)) return showNotice("Lista jest pusta!", "warning");
    
    const pinInput = document.getElementById('employee-pin-input');
    const pin = pinInput ? pinInput.value : "";

    if (!pin) return showNotice("Wprowadź PIN!", "warning");

    const btn = document.querySelector('.quote-button');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            currentEmployeeName = data.name;
            showNotice(`Zalogowano jako: ${currentEmployeeName}`, "success");
            
            finalizeQuote(currentEmployeeName);
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (error) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }
}

window.finalizeQuote = function(employeeName) {
    lastGeneratedReportID = `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = getFormattedDate();

    const receiptHTML = `
        <div class="receipt">
            <div class="receipt-header">
                <h2>EL CARTEL EXPORT</h2>
                <p class="receipt-meta">Raport sprzedaży przedmiotów</p>
                <p class="receipt-meta">NR: ${lastGeneratedReportID}</p>
                <p class="receipt-meta">PRACOWNIK: ${employeeName.toUpperCase()}</p>
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
    btn.innerText = "PRZETWARZANIE...";

    // --- ZBIERANIE DANYCH DO PANELU SZEFA ---
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
        date: getFormattedDate(),
        employee: currentEmployeeName,
        items: itemsToLog
    };

    try {
        const canvas = await html2canvas(area, { 
            scale: 3, 
            backgroundColor: "#ffffff",
            useCORS: true
        });
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "raport.png");
            
            const embedPayload = {
                embeds: [{
                    title: "🚛 NOWY RAPORT SPRZEDAŻY",
                    color: 15995922,
                    fields: [
                        { name: "👤 Pracownik:", value: `\`${currentEmployeeName}\``, inline: true },
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
                // WYSYŁKA DO BAZY RAPORTÓW (W TLE)
                fetch(REPORTS_API_URL, {
                    method: "POST",
                    body: JSON.stringify(logPayload)
                }).catch(e => console.error("Błąd zapisu w arkuszu:", e));

                showNotice("Wysłano na Discord!", "success");
                closeModal();
                
                // AUTOMATYCZNE CZYSZCZENIE KOSZYKA PO WYSŁANIU
                Object.keys(counts).forEach(i => {
                    counts[i] = 0;
                    const inp = document.getElementById(`count-${i}`);
                    if (inp) inp.value = 0;
                });
                document.querySelectorAll('.custom-item').forEach(el => el.remove());
                calculateTotal();

            } else {
                showNotice("Błąd Webhooka!", "danger");
            }
        }, "image/png");
    } catch (e) {
        showNotice("Błąd generatora!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerText = "Wyślij raport na Discord";
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

// FUNKCJA ZWIJANIA PASKA NA MOBILE
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
    init();
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
            // Usunięcie wszystkich niestandardowych kart
            document.querySelectorAll('.custom-item').forEach(el => el.remove());
            calculateTotal();
            showNotice("Wyczyszczono listę!", "warning");
        };
    }
    
    // Obsługa ENTER w polu PIN
    const pinInput = document.getElementById('employee-pin-input');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generateQuote();
            }
        });
    }
});