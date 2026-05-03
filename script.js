const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500540604827046078/_uzuOq6EK9Ip0XggKscXNsmPRZrl4EdmBSLcWcMRaavI0wimpqkxWIRn8TrELISJ6RZQ"; // WKLEJ TUTAJ SWÓJ WEBHOOK

const inventory = [
    { name: "Zdobiona książka", min: 120, max: 120, category: "inne" },
    { name: "Dywan", min: 240, max: 240, category: "dom" },
    { name: "Laptop", min: 570, max: 600, category: "elektronika" },
    { name: "Komputer", min: 640, max: 680, category: "elektronika" },
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
    { name: "Złote kolczyki", min: 200, max: 200, category: "biżuteria" },
    //{ name: "Złoty zegarek", min: 1000, max: 1500, category: "biżuteria" },//
    //{ name: "Rum", min: 400, max: 500, category: "inne" },//
    //{ name: "Cygaro", min: 1000, max: 1500, category: "inne" },//
    { name: "Popsuty telefon", min: 90, max: 95, category: "elektronika" }
];

let counts = {};
let currentCategory = 'wszystkie';
let currentReceiptID = "";

// Generator ID paragonu
function generateID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = 'EC-';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    result += '-';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// Inicjalizacja listy przedmiotów
function init() {
    const list = document.getElementById('items-list');
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
        min += item.min * counts[index];
        max += item.max * counts[index];
    });
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

// GENEROWANIE PARAGONU
function generateQuote() {
    const hasItems = Object.values(counts).some(c => c > 0);
    const finalPrice = document.getElementById('final-price-input').value;
    const employee = document.getElementById('employee-name-input').value;

    if (!hasItems) return showNotice("Koszyk jest pusty!", "warning");
    if (!employee) return showNotice("Wpisz dane pracownika!", "warning");
    if (!finalPrice) return showNotice("Wpisz całkowitą kwotę transakcji!", "warning");

    currentReceiptID = generateID();
    document.getElementById('receipt-id-display').innerText = `NR: ${currentReceiptID}`;
    document.getElementById('receipt-employee-display').innerText = `PRAC.: ${employee.toUpperCase()}`;
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

    document.getElementById('quote-modal').classList.add('active');
}

// WYSYŁKA NA DISCORD
async function sendToDiscord() {
    const btn = document.getElementById('send-discord-btn');
    const area = document.getElementById('receipt-capture-area');
    const employee = document.getElementById('employee-name-input').value;
    
    btn.disabled = true;
    btn.innerText = "Wysyłanie...";

    try {
        const canvas = await html2canvas(area, { scale: 2 });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, `paragon-${currentReceiptID}.png`);
            formData.append("payload_json", JSON.stringify({
                content: `🧾 **Nowy Paragon!**\nID: \`${currentReceiptID}\`\nPracownik: **${employee}**\nSuma: \`${document.getElementById('receipt-total').innerText}\``
            }));
            const res = await fetch(DISCORD_WEBHOOK_URL, { method: "POST", body: formData });
            if (res.ok) {
                showNotice("Wysłano na Discord!", "success");
                closeModal();
            } else throw new Error();
        });
    } catch (e) {
        showNotice("Błąd wysyłki!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerText = "Wyślij na Discord";
    }
}

document.getElementById('send-discord-btn').onclick = sendToDiscord;
document.getElementById('search-input').addEventListener('input', applyFilters);

// KREATOR REKLAM
function insertTag(tag) {
    const area = document.getElementById('ad-input');
    const s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.substring(0, s) + tag + area.value.substring(e);
    updateAdPreview();
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

function copyAd() {
    navigator.clipboard.writeText(document.getElementById('ad-input').value);
    showNotice("Skopiowano reklamę!", "success");
}

function closeModal() { document.getElementById('quote-modal').classList.remove('active'); }

// RESET WSZYSTKIEGO
document.getElementById('reset-btn').onclick = () => {
    Object.keys(counts).forEach(i => {
        counts[i] = 0;
        const inp = document.getElementById(`count-${i}`);
        if(inp) inp.value = 0;
    });
    document.getElementById('final-price-input').value = "";
    document.getElementById('employee-name-input').value = "";
    calculateTotal();
    showNotice("Wyczyszczono koszyk!", "warning");
};

function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

init();
