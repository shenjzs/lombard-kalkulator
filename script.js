// ==========================================
// KONFIGURACJA
// ==========================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500540604827046078/_uzuOq6EK9Ip0XggKscXNsmPRZrl4EdmBSLcWcMRaavI0wimpqkxWIRn8TrELISJ6RZQ"; 
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";

const inventory = [
    { name: "Zdobiona książka", min: 120, max: 120, category: "inne" },
    { name: "Dywan", min: 240, max: 240, category: "dom" },
    { name: "Komputer (laptop)", min: 570, max: 600, category: "elektronika" },
    { name: "Komputer (stacjonarny)", min: 640, max: 680, category: "elektronika" },
    { name: "Konsola", min: 370, max: 400, category: "elektronika" },
    { name: "Konsola DJ", min: 600, max: 640, category: "elektronika" },
    { name: "Kobieca plastikowa figurka", min: 90, max: 90, category: "inne" },
    { name: "Plastikowa figurka małpki", min: 80, max: 80, category: "inne" },
    { name: "Kwiat", min: 60, max: 60, category: "dom" },
    { name: "Gitara elektryczna", min: 440, max: 480, category: "elektronika" },
    { name: "Dziwna substancja", min: 90, max: 90, category: "inne" },
    { name: "Dziwna szara substancja", min: 160, max: 160, category: "inne" },
    { name: "Biżuteria", min: 210, max: 240, category: "biżuteria" },
    { name: "Brudna biżuteria", min: 130, max: 150, category: "biżuteria" },
    { name: "Katana", min: 480, max: 480, category: "inne" },
    { name: "Mikrofala", min: 250, max: 280, category: "dom" },
    { name: "Mikser", min: 130, max: 160, category: "dom" },
    { name: "Monitor", min: 120, max: 140, category: "elektronika" },
    { name: "Obraz", min: 110, max: 110, category: "dom" },
    { name: "Obraz ścienny", min: 175, max: 175, category: "dom" },
    { name: "Głośnik", min: 120, max: 145, category: "elektronika" },
    { name: "Telewizor", min: 570, max: 600, category: "elektronika" },
    { name: "Zegarek", min: 140, max: 160, category: "biżuteria" },
    { name: "Złota bransoletka", min: 200, max: 200, category: "biżuteria" },
	{ name: "Złota moneta", min: 50, max: 50, category: "inne" },
    { name: "Złote kolczyki", min: 200, max: 200, category: "biżuteria" },
    { name: "Popsuty telefon", min: 90, max: 95, category: "elektronika" }
];

let counts = {};
let currentCategory = 'wszystkie';
let currentMinTotal = 0; 
let currentMaxTotal = 0; 
let currentEmployeeName = ""; 

function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
}

function generateID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = 'EC-';
    for(let i=0; i<8; i++) res += chars[Math.floor(Math.random()*chars.length)];
    return res;
}

// NOWE FUNKCJE: STATYSTYKI PRACOWNIKA
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

function init() {
    const list = document.getElementById('items-list');
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
                <span class="item-price">${item.min === item.max ? item.min + '$' : item.min + '$ - ' + item.max + '$'}</span>
            </div>
            <div class="controls">
                <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                <input type="number" id="count-${index}" class="quantity-input" value="0" min="0" oninput="handleInput(${index}, this.value)">
                <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
            </div>
        `;
        list.appendChild(card);
    });
    document.getElementById('ad-input').addEventListener('input', updateAdPreview);
    updateAdPreview();
}

function updateCount(index, change) {
    counts[index] = Math.max(0, (counts[index] || 0) + change);
    document.getElementById(`count-${index}`).value = counts[index];
    calculateTotal();
}

function handleInput(index, value) {
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
    document.getElementById('bonus-range').innerText = '+' + (max - min) + '$';
}

function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const adSection = document.getElementById('ad-section');
    const itemsList = document.getElementById('items-list');

    if (currentCategory === 'reklama') {
        adSection.classList.remove('hidden');
        itemsList.classList.add('hidden');
    } else {
        adSection.classList.add('hidden');
        itemsList.classList.remove('hidden');
        document.querySelectorAll('.item-card').forEach(card => {
            const name = card.getAttribute('data-name');
            const cat = card.getAttribute('data-category');
            const match = name.includes(term) && (currentCategory === 'wszystkie' || cat === currentCategory);
            card.classList.toggle('hidden', !match);
        });
    }
}

async function generateQuote() {
    const hasItems = Object.values(counts).some(c => c > 0);
    const finalPriceInput = document.getElementById('final-price-input');
    const finalPrice = parseFloat(finalPriceInput.value);
    const pinInput = document.getElementById('employee-pin-input');
    const pin = pinInput ? pinInput.value : "";

    if (!hasItems) return showNotice("Koszyk jest pusty!", "warning");
    
    if (isNaN(finalPrice)) {
        return showNotice("Wpisz kwotę transakcji!", "danger");
    }
    
    if (finalPrice < currentMinTotal) {
        return showNotice(`Kwota zbyt niska! Minimum to ${currentMinTotal}$.`, "danger");
    }

    if (finalPrice > currentMaxTotal) {
        return showNotice(`Kwota zbyt wysoka! Maksimum to ${currentMaxTotal}$.`, "danger");
    }

    if (!pin) return showNotice("Wprowadź PIN pracownika!", "warning");

    const btn = document.getElementById('quote-btn');
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${GOOGLE_SHEETS_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            currentEmployeeName = data.name;
            showNotice(`Zalogowano jako: ${currentEmployeeName}`, "success");
            
            finalizeQuote(currentEmployeeName, finalPrice);
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

function finalizeQuote(employeeName, finalPrice) {
    const receiptID = generateID();
    document.getElementById('current-receipt-date').innerText = getFormattedDate();
    document.getElementById('receipt-id-display').innerText = `NR: ${receiptID}`;
    document.getElementById('receipt-employee-display').innerText = `PRAC.: ${employeeName.toUpperCase()}`;
    document.getElementById('receipt-total').innerText = finalPrice + '$';

    const itemsDiv = document.getElementById('receipt-items');
    itemsDiv.innerHTML = '';
    inventory.forEach((item, i) => {
        if (counts[i] > 0) {
            const row = document.createElement('div');
            row.className = 'receipt-row';
            row.innerHTML = `<span>${item.name} x${counts[i]}</span><span>${item.min * counts[i]}$</span>`;
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

    // WYŚWIETLANIE STATYSTYK W MODALU (NOWA, ELEGANCKA WERSJA)
    const statDiv = document.getElementById('employee-stats-display');
    if (statDiv) {
        const currentStat = getDailyStat(employeeName);
        const predictedStat = currentStat + finalPrice;
        
        statDiv.innerHTML = `
            <div class="stat-box-inner">
                <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                <div class="stat-details">
                    <span class="stat-label">Twój dzisiejszy obrót</span>
                    <span class="stat-value">${predictedStat}$</span>
                </div>
            </div>
        `;
        statDiv.style.display = "block";
    }

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

    try {
        const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "paragon.png");
            
            const embedPayload = {
                embeds: [{
                    title: "📑 Wystawiono nowy paragon!",
                    color: 36991, 
                    fields: [
                        { name: "📋 Numer paragonu:", value: `\`${receiptID}\``, inline: true },
                        { name: "👤 Pracownik:", value: `**${employee}**`, inline: true },
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
                addDailyStat(currentEmployeeName, finalPriceNumeric);
                showNotice("Wysłano na Discord!", "success");
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

async function copyReceiptToClipboard() {
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
                
                const finalPriceText = document.getElementById('receipt-total').innerText;
                const finalPriceNumeric = parseFloat(finalPriceText.replace('$', ''));
                addDailyStat(currentEmployeeName, finalPriceNumeric);

                showNotice("Skopiowano paragon do schowka!", "success");
                closeModal();
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

function updateAdPreview() {
    const input = document.getElementById('ad-input').value;
    const preview = document.getElementById('ad-preview');
    const colors = {'~r~':'#ff4444','~g~':'#33ff33','~b~':'#3399ff','~y~':'#ffff33','~p~':'#cc66ff','~o~':'#ff9933','~w~':'#fff','~s~':'#fff'};
    let html = "", style = "color:#fff", bold = false;
    
    input.split(/(~[a-z]~)/g).forEach(p => {
        if (p === '~h~') bold = !bold;
        else if (colors[p]) style = `color:${colors[p]}`;
        else html += `<span style="${style};font-weight:${bold?900:400}">${p}</span>`;
    });
    preview.innerHTML = html;
}

function insertTag(tag) {
    const area = document.getElementById('ad-input');
    const s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.substring(0, s) + tag + area.value.substring(e);
    updateAdPreview();
}

function copyAd() {
    navigator.clipboard.writeText(document.getElementById('ad-input').value);
    showNotice("Skopiowano reklamę!", "success");
}

function closeModal() { document.getElementById('quote-modal').classList.remove('active'); }

function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

document.getElementById('reset-btn').onclick = () => {
    Object.keys(counts).forEach(i => {
        counts[i] = 0;
        const inp = document.getElementById(`count-${i}`);
        if(inp) inp.value = 0;
    });
    document.getElementById('final-price-input').value = "";
    calculateTotal();
    showNotice("Wyczyszczono koszyk!", "warning");
};

document.getElementById('send-discord-btn').onclick = sendToDiscord;
document.getElementById('copy-receipt-btn').onclick = copyReceiptToClipboard;
document.getElementById('search-input').addEventListener('input', applyFilters);

const triggerGenerateQuote = function(e) {
    if (e.key === 'Enter') generateQuote();
};
document.getElementById('employee-pin-input').addEventListener('keypress', triggerGenerateQuote);
document.getElementById('final-price-input').addEventListener('keypress', triggerGenerateQuote);

init();
