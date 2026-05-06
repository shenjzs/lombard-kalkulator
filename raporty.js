// ==========================================
// KONFIGURACJA LINKÓW
// ==========================================
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";
const BOSS_DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1500540604827046078/_uzuOq6EK9Ip0XggKscXNsmPRZrl4EdmBSLcWcMRaavI0wimpqkxWIRn8TrELISJ6RZQ";

// ==========================================
// LOGOWANIE I AUTORYZACJA
// ==========================================
async function loginBoss() {
    const pin = document.getElementById('boss-pin-input').value;
    const btn = document.getElementById('login-btn');
    if (!pin) return showNotice("Wprowadź PIN!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();
        if (data.isValid) { 
            document.getElementById('logged-boss-name').innerText = data.name.toUpperCase();
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('dashboard-screen').classList.remove('hidden');
            showNotice(`Zalogowano pomyślnie jako ${data.name}`, "success");
            loadRealData(); 
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (e) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Zaloguj do panelu <i class="fas fa-arrow-right"></i>';
    }
}

function logoutBoss() {
    document.getElementById('boss-pin-input').value = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.add('active');
}

// ==========================================
// ANALIZA I FILTROWANIE DANYCH
// ==========================================

// Pomocnicza funkcja do zamiany formatu DD.MM.YYYY na obiekt Date
function parseDate(dateStr) {
    const parts = dateStr.split(".");
    // parts[2] = rok, parts[1]-1 = miesiąc (0-11), parts[0] = dzień
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    d.setHours(0, 0, 0, 0);
    return d;
}

async function loadRealData() {
    // Pobieramy wartości z pól kalendarza
    const dateFromValue = document.getElementById('filter-date-from').value;
    const dateToValue = document.getElementById('filter-date-to').value;

    // Konwertujemy wybrane daty na obiekty Date i resetujemy godziny do północy
    let filterStart = dateFromValue ? new Date(dateFromValue) : null;
    let filterEnd = dateToValue ? new Date(dateToValue) : null;

    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd) filterEnd.setHours(0, 0, 0, 0);

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports`);
        const data = await response.json();
        
        // RESETUJEMY LICZNIKI
        let totalBuy = 0;
        let totalSell = 0;
        const groupedBuy = {};
        const groupedSell = {};

        data.forEach(row => {
            // Parsujemy datę z arkusza i czyścimy czas
            const rowDate = parseDate(row.date);
            
            // LOGIKA FILTROWANIA (Porównujemy tylko czyste daty bez godzin)
            if (filterStart && rowDate < filterStart) return;
            if (filterEnd && rowDate > filterEnd) return;

            if (row.type === "skup") {
                totalBuy += row.total;
                if (!groupedBuy[row.name]) groupedBuy[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedBuy[row.name].qty += row.qty;
                groupedBuy[row.name].total += row.total;
            } else if (row.type === "sprzedaz") {
                totalSell += row.total;
                if (!groupedSell[row.name]) groupedSell[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedSell[row.name].qty += row.qty;
                groupedSell[row.name].total += row.total;
            }
        });

        // AKTUALIZACJA KPI NA EKRANIE
        document.getElementById('total-buy').innerText = `${totalBuy}$`;
        document.getElementById('total-sell').innerText = `${totalSell}$`;
        let balance = totalSell - totalBuy;
        document.getElementById('total-balance').innerText = `${balance}$`;
        document.getElementById('total-balance').style.color = balance >= 0 ? '#22c55e' : '#ef4444';

        // RENDEROWANIE TABEL
        const renderRows = (tableId, arr, isExpense) => {
            const tbody = document.getElementById(tableId);
            const items = Object.values(arr).sort((a,b) => b.total - a.total);
            
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak danych w wybranym okresie</td></tr>`;
                return;
            }
            
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center;"><span class="qty-badge">x${item.qty}</span></td>
                    <td style="text-align: right;" class="price-val" style="color: ${isExpense ? 'var(--danger)' : 'var(--success)'}">
                        ${isExpense ? '-' : '+'}${item.total}$
                    </td>
                </tr>
            `).join('');
        };

        renderRows('buy-table-body', groupedBuy, true);
        renderRows('sell-table-body', groupedSell, false);
        
        document.getElementById('report-timestamp').innerText = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Błąd bazy danych:", err);
    }
}

// ==========================================
// GENEROWANIE RAPORTU GRAFICZNEGO (DISCORD)
// ==========================================
async function sendReportToDiscord() {
    const btn = document.getElementById('send-report-btn');
    const area = document.getElementById('report-visual-card');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';

    // Przygotowanie szablonu wizualnego
    document.getElementById('v-buy').innerText = document.getElementById('total-buy').innerText;
    document.getElementById('v-sell').innerText = document.getElementById('total-sell').innerText;
    document.getElementById('v-bal').innerText = document.getElementById('total-balance').innerText;
    
    const dFrom = document.getElementById('filter-date-from').value || "POCZĄTEK";
    const dTo = document.getElementById('filter-date-to').value || "DZIŚ";
    document.getElementById('v-report-date').innerText = `ZAKRES: ${dFrom} — ${dTo}`;
    
    document.getElementById('v-footer-id').innerText = `REPORT_ID: ${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    const copyToVisualTable = (sourceId, targetId) => {
        const rows = Array.from(document.querySelectorAll(`#${sourceId} tr`)).slice(0, 5);
        const container = document.getElementById(targetId);
        
        if (rows.length === 0 || rows[0].innerText.includes("Brak danych")) {
            container.innerHTML = `<div class="v-row"><span>Brak danych</span><span>0$</span></div>`;
            return;
        }

        container.innerHTML = rows.map(r => {
            const cells = r.querySelectorAll('td');
            if (cells.length < 3) return '';
            return `<div class="v-row"><span>${cells[0].innerText}</span><span>${cells[2].innerText}</span></div>`;
        }).join('');
    };

    copyToVisualTable('buy-table-body', 'v-buy-rows');
    copyToVisualTable('sell-table-body', 'v-sell-rows');

    try {
        const canvas = await html2canvas(area, { 
            scale: 2, 
            backgroundColor: "#0f172a",
            logging: false,
            useCORS: true
        });
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "raport_elcartel.png");
            
            const payload = {
                embeds: [{
                    title: "📊 OFICJALNY RAPORT ANALITYCZNY ZARZĄDU",
                    description: `Raport finansowy wygenerowany dla okresu: **${dFrom} do ${dTo}**.`,
                    color: 2303786,
                    image: { url: "attachment://raport_elcartel.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System Zarządzania Biznesem EL CARTEL" }
                }]
            };

            formData.append("payload_json", JSON.stringify(payload));
            const res = await fetch(BOSS_DISCORD_WEBHOOK, { method: "POST", body: formData });
            if (res.ok) showNotice("Grafika raportu wysłana na Discord!", "success");
        }, "image/png");
    } catch (e) {
        showNotice("Błąd przy generowaniu obrazu!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij raport na kanał';
    }
}

// ==========================================
// POWIADOMIENIA I EVENTY
// ==========================================
function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 500); 
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const dateFromInput = document.getElementById('filter-date-from');
    const dateToInput = document.getElementById('filter-date-to');

    if (dateFromInput) dateFromInput.addEventListener('change', () => loadRealData());
    if (dateToInput) dateToInput.addEventListener('change', () => loadRealData());

    const pinInput = document.getElementById('boss-pin-input');
    if (pinInput) {
        pinInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') loginBoss();
        });
    }
});