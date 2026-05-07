// ==========================================
// KONFIGURACJA LINKÓW I CEN
// ==========================================
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";
const BOSS_DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1501722411471470792/x8iSFE5OgDYMXCf4jpca70DvA87v0S1MSKz0ODfSQ-x5ajwLblRvjY7oy3q9OadoyHmD";

// SŁOWNIK CEN AWARYJNYCH (KOŁO RATUNKOWE)
// Używany TYLKO wtedy, gdy towar został sprzedany w wybranym okresie dat, 
// ale ani razu nie został w tym samym okresie skupiony. Wpisz tu maksymalne ceny skupu.
const BUY_PRICES = {
    "Dywan": 240,
    "Zdobiona książka": 120,
    "Komputer (laptop)": 600,
    "Komputer (stacjonarny)": 680,
    "Konsola": 400,
    "Konsola DJ": 640,
    "Kobieca plastikowa figurka": 90,
    "Stara zapalniczka": 15,
    "Plastikowa figurka małpki": 80,
    "Kwiat": 60,
    "Gitara elektryczna": 480,
    "Dziwna substancja": 90,
    "Dziwna szara substancja": 160,
    "Biżuteria": 240,
    "Brudna biżuteria": 140,
    "Katana": 480,
    "Mikrofala": 280,
    "Mikser": 160,
    "Monitor": 140,
    "Obraz": 110,
    "Obraz ścienny": 170,
    "Głośnik": 140,
    "Telewizor": 600,
    "Zegarek": 160,
    "Stary popsuty telefon": 80
};

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

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split(".");
    if (parts.length !== 3) return new Date();
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    d.setHours(0, 0, 0, 0);
    return d;
}

window.applyFilter = function() {
    const btn = document.getElementById('ok-filter-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    showNotice("Filtrowanie bazy danych...", "info");
    
    loadRealData().then(() => {
        btn.innerHTML = 'OK';
        showNotice("Dane zostały pomyślnie przefiltrowane!", "success");
    });
}

window.refreshPage = function() {
    const icon = document.getElementById('refresh-icon');
    if(icon) icon.classList.add('fa-spin');
    showNotice("Odświeżanie statystyk...", "info");
    
    loadRealData().then(() => {
        if(icon) icon.classList.remove('fa-spin');
        showNotice("Statystyki zostały zaktualizowane!", "success");
    }).catch(err => {
        if(icon) icon.classList.remove('fa-spin');
        showNotice("Błąd podczas odświeżania statystyk!", "danger");
    });
}

async function loadRealData() {
    const dateFromValue = document.getElementById('filter-date-from').value;
    const dateToValue = document.getElementById('filter-date-to').value;

    let filterStartTS = null;
    let filterEndTS = null;

    if (dateFromValue) {
        const dFrom = new Date(dateFromValue);
        dFrom.setHours(0, 0, 0, 0); 
        filterStartTS = dFrom.getTime();
    }
    
    if (dateToValue) {
        const dTo = new Date(dateToValue);
        dTo.setHours(23, 59, 59, 999); 
        filterEndTS = dTo.getTime();
    }

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports`);
        const data = await response.json();
        
        let totalBuy = 0;
        let totalSell = 0;
        let totalProfit = 0; 
        
        const groupedBuy = {};
        const groupedSell = {};
        const employeeRanking = {}; 
        
        // NOWY OBIEKT: Służy do wyliczania średniej ceny skupu na żywo
        const dynamicBuyStats = {};

        // PIERWSZA PĘTLA: Zbieramy dane TYLKO ze skupu do ustalenia realnych kosztów
        data.forEach(row => {
            const rowDate = parseDate(row.date);
            const rowTS = rowDate.getTime();
            
            if (filterStartTS && rowTS < filterStartTS) return;
            if (filterEndTS && rowTS > filterEndTS) return;

            if (row.type === "skup") {
                if (!dynamicBuyStats[row.name]) {
                    dynamicBuyStats[row.name] = { qty: 0, total: 0 };
                }
                dynamicBuyStats[row.name].qty += row.qty;
                dynamicBuyStats[row.name].total += row.total;
            }
        });

        // DRUGA PĘTLA: Główne obliczenia i budowa tabel
        data.forEach(row => {
            const rowDate = parseDate(row.date);
            const rowTS = rowDate.getTime();
            
            if (filterStartTS && rowTS < filterStartTS) return;
            if (filterEndTS && rowTS > filterEndTS) return;

            const empName = row.employee || "Nieznany";
            if (!employeeRanking[empName]) {
                employeeRanking[empName] = { name: empName, totalSell: 0 };
            }

            if (row.type === "skup") {
                totalBuy += row.total;
                if (!groupedBuy[row.name]) groupedBuy[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedBuy[row.name].qty += row.qty;
                groupedBuy[row.name].total += row.total;
                
            } else if (row.type === "sprzedaz") {
                totalSell += row.total;
                
                // ZAAWANSOWANE OBLICZANIE ZYSKU NA CZYSTO
                let itemCost = 0;
                
                if (dynamicBuyStats[row.name] && dynamicBuyStats[row.name].qty > 0) {
                    // System znajduje realną średnią cenę skupu z danego okresu
                    itemCost = dynamicBuyStats[row.name].total / dynamicBuyStats[row.name].qty;
                } else if (BUY_PRICES[row.name] !== undefined) {
                    // Jeśli nie skupiono tego towaru, system używa awaryjnego cennika z kodu
                    itemCost = BUY_PRICES[row.name];
                } else {
                    // Jeśli to całkowicie własny/nieznany przedmiot, system zakłada ostrożną marżę 20%
                    itemCost = (row.total / row.qty) * 0.8;
                }
                
                let itemProfit = row.total - (itemCost * row.qty);
                totalProfit += itemProfit;

                if (!groupedSell[row.name]) groupedSell[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedSell[row.name].qty += row.qty;
                groupedSell[row.name].total += row.total;
                
                employeeRanking[empName].totalSell += row.total;
            }
        });

        // AKTUALIZACJA WIDOKU KPI
        document.getElementById('total-buy').innerText = `${totalBuy}$`;
        document.getElementById('total-sell').innerText = `${totalSell}$`;
        
        let balance = totalSell - totalBuy;
        document.getElementById('total-balance').innerText = `${balance}$`;
        document.getElementById('total-balance').style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
        
        // Wyświetlamy inteligentny zysk netto
        document.getElementById('total-profit').innerText = `${Math.round(totalProfit)}$`;
        document.getElementById('total-profit').style.color = totalProfit >= 0 ? 'var(--warning)' : 'var(--danger)';

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
        
        const renderRanking = () => {
            const tbody = document.getElementById('ranking-table-body');
            const rankingItems = Object.values(employeeRanking).sort((a,b) => b.totalSell - a.totalSell);
            
            if (rankingItems.length === 0 || rankingItems.every(r => r.totalSell === 0)) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak danych sprzedażowych</td></tr>`;
                return;
            }
            
            tbody.innerHTML = rankingItems
                .filter(item => item.totalSell > 0)
                .map((item, index) => `
                <tr>
                    <td style="width: 80px;"><span class="rank-badge">#${index + 1}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: right; color: var(--success); font-weight: 800;">
                        +${item.totalSell}$
                    </td>
                </tr>
            `).join('');
        };

        renderRanking();
        
        document.getElementById('report-timestamp').innerText = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Błąd bazy danych:", err);
        throw err; 
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
            if (res.ok) {
                showNotice("Grafika raportu wysłana na Discord!", "success");
            } else {
                showNotice("Błąd wysyłania Webhooka!", "danger");
            }
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
    let colorClass = type;
    if(type === 'info') colorClass = 'success';

    const t = document.createElement('div');
    t.className = `toast ${colorClass}`;
    if(type === 'info') t.style.borderLeftColor = 'var(--accent-color)';

    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 500); 
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('boss-pin-input');
    if (pinInput) {
        pinInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') loginBoss();
        });
    }
});