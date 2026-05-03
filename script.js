const inventory = [
    { name: "Zdobiona książka", displayPrice: "120$", min: 120, max: 120 },
    { name: "Dywan", displayPrice: "240$", min: 240, max: 240 },
    { name: "Laptop", displayPrice: "570$-600$", min: 570, max: 600 },
    { name: "Komputer", displayPrice: "640$-680$", min: 640, max: 680 },
    { name: "Konsola", displayPrice: "370$-400$", min: 370, max: 400 },
    { name: "Konsola DJ", displayPrice: "600$-640$", min: 600, max: 640 },
    { name: "Kobieca plastikowa figurka", displayPrice: "90$", min: 90, max: 90 },
    { name: "Plastikowa figurka małpki", displayPrice: "80$", min: 80, max: 80 },
    { name: "Kwiat", displayPrice: "60$", min: 60, max: 60 },
    { name: "Gitara elektryczna", displayPrice: "440$-480$", min: 440, max: 480 },
    { name: "Dziwna substancja", displayPrice: "90$", min: 90, max: 90 },
    { name: "Dziwna szara substancja", displayPrice: "160$", min: 160, max: 160 },
    { name: "Biżuteria", displayPrice: "210$-240$", min: 210, max: 240 },
    { name: "Brudna Biżuteria", displayPrice: "130$-150$", min: 130, max: 150 },
    { name: "Katana", displayPrice: "480$", min: 480, max: 480 },
    { name: "Mikrofala", displayPrice: "250$-280$", min: 250, max: 280 },
    { name: "Mikser", displayPrice: "130$-160$", min: 130, max: 160 },
    { name: "Monitor", displayPrice: "120$-140$", min: 120, max: 140 },
    { name: "Obraz", displayPrice: "110$", min: 110, max: 110 },
    { name: "Obraz ścienny", displayPrice: "175$", min: 175, max: 175 },
    { name: "Głośnik", displayPrice: "120$-145$", min: 120, max: 145 },
    { name: "Telewizor", displayPrice: "570$-600$", min: 570, max: 600 },
    { name: "Zegarek", displayPrice: "140$-160$", min: 140, max: 160 },
    { name: "Złota bransoletka", displayPrice: "200$", min: 200, max: 200 },
    { name: "Złote kolczyki", displayPrice: "200$", min: 200, max: 200 },
    { name: "Złoty zegarek", displayPrice: "1000$-1500$", min: 1000, max: 1500 },
    { name: "Rum", displayPrice: "400$-500$", min: 400, max: 500 },
    { name: "Cygara", displayPrice: "1000$-1500$", min: 1000, max: 1500 },
    { name: "Popsuty telefon", displayPrice: "90$-95$", min: 90, max: 95 }
];

let counts = {};

function init() {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    inventory.forEach((item, index) => {
        counts[index] = 0;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-name', item.name.toLowerCase());
        card.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">Cena: ${item.displayPrice}</span>
            </div>
            <div class="controls">
                <button class="btn-circle minus" onclick="updateCount(${index}, -1)">-</button>
                <span id="count-${index}" class="quantity">0</span>
                <button class="btn-circle plus" onclick="updateCount(${index}, 1)">+</button>
            </div>
        `;
        list.appendChild(card);
    });
}

document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.item-card').forEach(card => {
        const name = card.getAttribute('data-name');
        card.classList.toggle('hidden', !name.includes(term));
    });
});

function updateCount(index, change) {
    counts[index] = Math.max(0, counts[index] + change);
    document.getElementById(`count-${index}`).innerText = counts[index];
    calculateTotal();
}

function calculateTotal() {
    let minTotal = 0;
    let maxTotal = 0;
    inventory.forEach((item, index) => {
        minTotal += item.min * counts[index];
        maxTotal += item.max * counts[index];
    });
    document.getElementById('total-price').innerText = minTotal + '$';
    document.getElementById('bonus-range').innerText = `+${maxTotal - minTotal}$`;
}

document.getElementById('reset-btn').addEventListener('click', () => {
    inventory.forEach((_, index) => {
        counts[index] = 0;
        document.getElementById(`count-${index}`).innerText = 0;
    });
    document.getElementById('search-input').value = '';
    document.querySelectorAll('.item-card').forEach(card => card.classList.remove('hidden'));
    calculateTotal();
    showNotice('Koszyk wyczyszczony', 'warning');
});

function showNotice(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let icon = '💡';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚫';
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

init();
window.onload = () => {
    showNotice('System gotowy!', 'success');
};
