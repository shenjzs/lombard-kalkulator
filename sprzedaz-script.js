const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500573620605550725/VmpdLB3qN1FT6Jkf-U-Wo1cig-WEpVjleki4f-EA45G5QfSuBJeC3f1fqCKB_LTeXOQ5"; 

// UWAGA: WKLEJ TUTAJ SWÓJ ADRES URL GOOGLE SHEETS
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec"; 

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
let currentEmployeeName = ""; // Globalna zmienna przechowująca imię po autoryzacji

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
}

window.filterCategory = function(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.item-card').forEach(card => {
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
        const response = await fetch(`${GOOGLE_SHEETS_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            currentEmployeeName = data.name;
            showNotice(`Zalogowano jako: ${currentEmployeeName}`, "success");
            
            // Usunięto czyszczenie pola PIN, kod zostaje w polu na kolejne transakcje
            
            // Generujemy paragon
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
                <p class="receipt-meta">KIEROWCA: ${employeeName.toUpperCase()}</p>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items-list">
                ${inventory.map((item, i) => counts[i] > 0 ? `
                    <div class="receipt-row">
                        <span>${item.name} x${counts[i]}</span>
                        <span>${item.price * counts[i]}$</span>
                    </div>
                ` : '').join('')}
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
                showNotice("Wysłano na Discord!", "success");
                closeModal();
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
