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
    "Komputer (laptop)": 585,
    "Komputer (stacjonarny)": 660,
    "Konsola": 385,
    "Konsola DJ": 620,
    "Kobieca plastikowa figurka": 90,
    "Plastikowa figurka małpki": 80,
    "Kwiat": 60,
    "Gitara elektryczna": 460,
    "Dziwna substancja": 90,
    "Dziwna szara substancja": 160,
    "Biżuteria": 225,
    "Brudna biżuteria": 140,
    "Katana": 480,
    "Mikrofala": 265,
    "Mikser": 145,
    "Monitor": 130,
    "Obraz": 110,
    "Obraz ścienny": 175,
    "Głośnik": 132,
    "Telewizor": 585,
    "Zegarek": 150,
	"Złota bransoletka": 200,
	"Złote kolczyki": 200,
    "Stary popsuty telefon": 92
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
            // WERYFIKACJA UPRAWNIEŃ SZEFA
            if (data.role && data.role.toLowerCase().trim() === 'szef') {
                document.getElementById('logged-boss-name').innerText = data.name.toUpperCase();
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('dashboard-screen').classList.remove('hidden');
                showNotice(`Zalogowano pomyślnie jako ${data.name}`, "success");
                loadRealData(); 
            } else {
                // Jeśli kod PIN jest poprawny, ale pracownik nie ma roli "szef"
                showNotice("Odmowa! Brak uprawnień zarządcy.", "danger");
                document.getElementById('boss-pin-input').value = ""; // Czyści błędny PIN z pola
            }
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
    // Odczyt formatu ISO (z literką T) z arkuszy Google
    if (typeof dateStr === 'string' && dateStr.includes("T")) {
        return new Date(dateStr); 
    }
    const parts = dateStr.split(".");
    if (parts.length !== 3) {
        return new Date(dateStr);
    }
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

        // TABELE DO 3 OPCJI RANKINGÓW
        const rankingBuy = {};
        const rankingSell = {};
        
        // TABELA DO LIVE FEED
        const rawFeed = [];
        
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

            // DODAJEMY DO LIVE FEED (Wszystkie odfiltrowane zdarzenia)
            rawFeed.push(row);

            const empName = row.employee || "Nieznany";

            if (row.type === "skup") {
                totalBuy += row.total;
                if (!groupedBuy[row.name]) groupedBuy[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedBuy[row.name].qty += row.qty;
                groupedBuy[row.name].total += row.total;

                // Do rankingu skupu dodajemy całkowitą wydaną kwotę
                if (!rankingBuy[empName]) {
                    rankingBuy[empName] = { name: empName, totalBuyVal: 0 };
                }
                rankingBuy[empName].totalBuyVal += row.total;

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
                
                // Do rankingu sprzedaży dodajemy całkowity zysk pracownika 
                if (!rankingSell[empName]) {
                    rankingSell[empName] = { name: empName, totalSellVal: 0 };
                }
                rankingSell[empName].totalSellVal += row.total;
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
        
        // RENDEROWANIE RANKINGU SKUPU
        const renderBuyRanking = () => {
            const tbody = document.getElementById('ranking-buy-table-body');
            const rankingItems = Object.values(rankingBuy).sort((a,b) => b.totalBuyVal - a.totalBuyVal);
            
            if (rankingItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak aktywności skupu</td></tr>`;
                return;
            }
            
            tbody.innerHTML = rankingItems
                .map((item, index) => `
                <tr>
                    <td style="width: 80px;"><span class="rank-badge">#${index + 1}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: right; color: var(--accent-color); font-weight: 800;">
                        ${item.totalBuyVal}$
                    </td>
                </tr>
            `).join('');
        };

        // RENDEROWANIE RANKINGU SPRZEDAŻY
        const renderSellRanking = () => {
            const tbody = document.getElementById('ranking-sell-table-body');
            const rankingItems = Object.values(rankingSell).sort((a,b) => b.totalSellVal - a.totalSellVal);
            
            if (rankingItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak aktywności sprzedaży</td></tr>`;
                return;
            }
            
            tbody.innerHTML = rankingItems
                .map((item, index) => `
                <tr>
                    <td style="width: 80px;"><span class="rank-badge">#${index + 1}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: right; color: var(--success); font-weight: 800;">
                        +${item.totalSellVal}$
                    </td>
                </tr>
            `).join('');
        };

        renderBuyRanking();
        renderSellRanking();

        // RENDEROWANIE LIVE FEED
        const renderLiveFeed = () => {
            const container = document.getElementById('activity-feed-container');
            // Odwracamy tablicę, żeby najnowsze rekordy z arkusza były na samej górze
            const feedItems = rawFeed.slice().reverse(); 
            
            if (feedItems.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary);">Brak zarejestrowanych operacji w tym okresie</div>`;
                return;
            }

            container.innerHTML = feedItems.map(item => {
                const isBuy = item.type === "skup";
                const actionText = isBuy ? "skupił(a)" : "sprzedał(a)";
                const actionClass = isBuy ? "buy" : "sell";
                const sign = isBuy ? "-" : "+";
                
                // Konwersja surowej daty z Google Sheets na czytelną
                let displayDate = item.date;
                if (typeof displayDate === 'string' && displayDate.includes('T')) {
                    const d = new Date(displayDate);
                    displayDate = d.toLocaleDateString('pl-PL'); 
                }
                
                return `
                    <div class="feed-item">
                        <span class="feed-time">[${displayDate}]</span>
                        <span class="feed-emp">${item.employee || "Nieznany"}</span>
                        <span class="feed-action ${actionClass}">${actionText}</span>
                        <span>${item.name} <span class="qty-badge" style="padding: 2px 6px; font-size: 0.75rem;">x${item.qty}</span></span>
                        <span class="feed-item-details ${actionClass}" style="color: ${isBuy ? 'var(--danger)' : 'var(--success)'}">${sign}${item.total}$</span>
                    </div>
                `;
            }).join('');
        };

        renderLiveFeed();
        
        document.getElementById('report-timestamp').innerText = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Błąd bazy danych:", err);
        throw err; 
    }
}

// ==========================================
// GENEROWANIE RAPORTU GRAFICZNEGO I DISCORD
// ==========================================
async function sendReportToDiscord() {
    const btn = document.getElementById('send-report-btn');
    const area = document.getElementById('report-visual-card');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';

    // Pobieranie wartości z Dashboardu do grafiki i embeda
    const totalBuyVal = document.getElementById('total-buy').innerText;
    const totalSellVal = document.getElementById('total-sell').innerText;
    const totalBalVal = document.getElementById('total-balance').innerText;
    const totalProfitVal = document.getElementById('total-profit').innerText;
    
    document.getElementById('v-buy').innerText = totalBuyVal;
    document.getElementById('v-sell').innerText = totalSellVal;
    document.getElementById('v-bal').innerText = totalBalVal;
    
    const dFrom = document.getElementById('filter-date-from').value || "POCZĄTEK";
    const dTo = document.getElementById('filter-date-to').value || "DZIŚ";
    document.getElementById('v-report-date').innerText = `ZAKRES: ${dFrom} — ${dTo}`;
    
    const reportID = Math.random().toString(36).substr(2, 8).toUpperCase();
    document.getElementById('v-footer-id').innerText = `REPORT_ID: ${reportID}`;

    // Przygotowanie Top 3 do Embeda (Skup)
    const topBuyRows = Array.from(document.querySelectorAll('#ranking-buy-table-body tr')).slice(0, 3);
    let topBuyStr = topBuyRows.map((r, i) => {
        const name = r.querySelector('strong') ? r.querySelector('strong').innerText : "Brak";
        const val = r.querySelector('td:last-child') ? r.querySelector('td:last-child').innerText : "0$";
        return `**${i+1}.** ${name} (${val})`;
    }).join('\n') || "Brak danych";

    // Przygotowanie Top 3 do Embeda (Sprzedaż)
    const topSellRows = Array.from(document.querySelectorAll('#ranking-sell-table-body tr')).slice(0, 3);
    let topSellStr = topSellRows.map((r, i) => {
        const name = r.querySelector('strong') ? r.querySelector('strong').innerText : "Brak";
        const val = r.querySelector('td:last-child') ? r.querySelector('td:last-child').innerText : "0$";
        return `**${i+1}.** ${name} (${val})`;
    }).join('\n') || "Brak danych";

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
                    title: "🏛️ PROTOKÓŁ ANALITYCZNY ZARZĄDU EL CARTEL",
                    description: `Dokładne zestawienie operacji finansowych dla okresu:\n📅 **${dFrom} — ${dTo}**`,
                    color: 3447003, // Niebieski Cartel
                    fields: [
                        { name: "📉 Wydatki (skup)", value: `\`${totalBuyVal}\``, inline: true },
                        { name: "📈 Przychody (sprzedaż + wywóz)", value: `\`${totalSellVal}\``, inline: true },
                        { name: "⚖️ Bilans", value: `\`${totalBalVal}\``, inline: true },
                        { name: "💎 Czysty zysk", value: ` 💰 ${totalProfitVal}`, inline: false },
                        { name: "🏆 Top zaopatrzeniowcy (skup)", value: topBuyStr, inline: true },
                        { name: "🚚 Top sprzedający (sprzedaż + wywózka)", value: topSellStr, inline: true }
                    ],
                    image: { url: "attachment://raport_elcartel.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: `System EL CARTEL PAWN SHOP | ID: ${reportID}` }
                }]
            };

            formData.append("payload_json", JSON.stringify(payload));
            const res = await fetch(BOSS_DISCORD_WEBHOOK, { method: "POST", body: formData });
            if (res.ok) {
                showNotice("Pełny raport wysłany na Discord!", "success");
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