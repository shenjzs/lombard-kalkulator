const inventory = [
    { name: "Zdobiona książka", displayPrice: "120$", min: 120, max: 120, category: "inne" },
    { name: "Dywan", displayPrice: "240$", min: 240, max: 240, category: "dom" },
    { name: "Laptop", displayPrice: "570$-600$", min: 570, max: 600, category: "elektronika" },
    { name: "Komputer", displayPrice: "640$-680$", min: 640, max: 680, category: "elektronika" },
    { name: "Konsola", displayPrice: "370$-400$", min: 370, max: 400, category: "elektronika" },
    { name: "Konsola DJ", displayPrice: "600$-640$", min: 600, max: 640, category: "elektronika" },
    { name: "Kobieca plastikowa figurka", displayPrice: "90$", min: 90, max: 90, category: "inne" },
    { name: "Plastikowa figurka małpki", displayPrice: "80$", min: 80, max: 80, category: "inne" },
    { name: "Kwiat", displayPrice: "60$", min: 60, max: 60, category: "dom" },
    { name: "Gitara elektryczna", displayPrice: "440$-480$", min: 440, max: 480, category: "elektronika" },
    { name: "Dziwna substancja", displayPrice: "90$", min: 90, max: 90, category: "inne" },
    { name: "Dziwna szara substancja", displayPrice: "160$", min: 160, max: 160, category: "inne" },
    { name: "Biżuteria", displayPrice: "210$-240$", min: 210, max: 240, category: "biżuteria" },
    { name: "Brudna Biżuteria", displayPrice: "130$-150$", min: 130, max: 150, category: "biżuteria" },
    { name: "Katana", displayPrice: "480$", min: 480, max: 480, category: "inne" },
    { name: "Mikrofala", displayPrice: "250$-280$", min: 250, max: 280, category: "dom" },
    { name: "Mikser", displayPrice: "130$-160$", min: 130, max: 160, category: "dom" },
    { name: "Monitor", displayPrice: "120$-140$", min: 120, max: 140, category: "elektronika" },
    { name: "Obraz", displayPrice: "110$", min: 110, max: 110, category: "dom" },
    { name: "Obraz ścienny", displayPrice: "175$", min: 175, max: 175, category: "dom" },
    { name: "Głośnik", displayPrice: "120$-145$", min: 120, max: 145, category: "elektronika" },
    { name: "Telewizor", displayPrice: "570$-600$", min: 570, max: 600, category: "elektronika" },
    { name: "Zegarek", displayPrice: "140$-160$", min: 140, max: 160, category: "biżuteria" },
    { name: "Złota bransoletka", displayPrice: "200$", min: 200, max: 200, category: "biżuteria" },
    { name: "Złote kolczyki", displayPrice: "200$", min: 200, max: 200, category: "biżuteria" },
    { name: "Złoty zegarek", displayPrice: "1000$-1500$", min: 1000, max: 1500, category: "biżuteria" },
    { name: "Rum", displayPrice: "400$-500$", min: 400, max: 500, category: "inne" },
    { name: "Cygaro", displayPrice: "1000$-1500$", min: 1000, max: 1500, category: "inne" },
    { name: "Popsuty telefon", displayPrice: "90$-95$", min: 90, max: 95, category: "elektronika" }
];

let counts = {};
let currentCategory = 'wszystkie';

function init() {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    inventory.forEach((item, index) => {
        counts[index] = 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.id = `item-card-${index}`;
        card.setAttribute('data-name', item.name.toLowerCase());
        card.setAttribute('data-category', item.category);
        card.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${item.displayPrice}</span>
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

function filterCategory(category, btn) {
    currentCategory = category;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
}

document.getElementById('search-input').addEventListener('input', applyFilters);

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
            const matchesSearch = name.includes(term);
            const matchesCategory = (currentCategory === 'wszystkie' || cat === currentCategory);
            card.classList.toggle('hidden', !(matchesSearch && matchesCategory));
        });
    }
}

function updateCount(index, change) {
    counts[index] = Math.max(0, (counts[index] || 0) + change);
    document.getElementById(`count-${index}`).value = counts[index];
    
    const card = document.getElementById(`item-card-${index}`);
    if (change > 0) {
        card.classList.remove('pulse-glow');
        void card.offsetWidth;
        card.classList.add('pulse-glow');
    }
    calculateTotal();
}

function handleInput(index, value) {
    let num = parseInt(value);
    if (isNaN(num) || num < 0) num = 0;
    counts[index] = num;
    calculateTotal();
}

function calculateTotal() {
    let minTotal = 0;
    let maxTotal = 0;
    inventory.forEach((item, index) => {
        minTotal += item.min * (counts[index] || 0);
        maxTotal += item.max * (counts[index] || 0);
    });
    document.getElementById('total-price').innerText = minTotal + '$';
    document.getElementById('bonus-range').innerText = `+${maxTotal - minTotal}$`;
}

function copyAd() {
    const text = document.getElementById('ad-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        showNotice('Skopiowano komendę!', 'success');
    }).catch(() => {
        showNotice('Błąd kopiowania', 'danger');
    });
}

function generateQuote() {
    let hasItems = Object.values(counts).some(count => count > 0);
    if (!hasItems) {
        showNotice('Koszyk jest pusty!', 'warning');
        return;
    }

    const receiptItems = document.getElementById('receipt-items');
    receiptItems.innerHTML = '';
    let total = 0;

    inventory.forEach((item, index) => {
        const qty = counts[index] || 0;
        if (qty > 0) {
            const itemTotal = item.min * qty;
            total += itemTotal;
            const row = document.createElement('div');
            row.className = 'receipt-row';
            row.innerHTML = `<span>${item.name} x${qty}</span><span>${itemTotal}$</span>`;
            receiptItems.appendChild(row);
        }
    });

    document.getElementById('receipt-total').innerText = total + '$';
    document.getElementById('quote-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('quote-modal').classList.remove('active');
}

document.getElementById('reset-btn').addEventListener('click', () => {
    let hasItems = Object.values(counts).some(count => count > 0);
    if (!hasItems) {
        showNotice('Koszyk jest już pusty!', 'danger');
        return;
    }
    inventory.forEach((_, index) => {
        counts[index] = 0;
        const el = document.getElementById(`count-${index}`);
        if(el) el.value = 0;
    });
    document.getElementById('search-input').value = '';
    applyFilters();
    calculateTotal();
    showNotice('Wyczyszczono koszyk', 'warning');
});

function showNotice(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚫';
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

window.onclick = function(event) {
    const modal = document.getElementById('quote-modal');
    if (event.target == modal) closeModal();
}

init();
window.onload = () => showNotice('System gotowy do pracy!', 'success');
