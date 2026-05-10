// ==========================================
// WERSJA APLIKACJI (Zmień, aby wymusić odświeżenie u wszystkich)
// ==========================================
const APP_VERSION = "2.4.9";

// ==========================================
// KONFIGURACJA LINKÓW I CEN
// ==========================================
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";
const BOSS_DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1501722411471470792/x8iSFE5OgDYMXCf4jpca70DvA87v0S1MSKz0ODfSQ-x5ajwLblRvjY7oy3q9OadoyHmD";

// ZMIENNE GLOBALNE DLA WYKRESÓW I CELU
let topItemsChartInstance = null;
let cashflowChartInstance = null;
let peakHoursChartInstance = null; 
window.currentGlobalGoal = 0;

// Globalna zmienna przechowująca przetworzone dane dla wyszukiwarki
window.globalSortedTransactions = [];

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
    "Stary popsuty telefon": 92,
	"Złota moneta z prezydentem": 100,
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
    
    // Obsługa formatu daty z czasem (DD.MM.YYYY HH:mm:ss)
    const parts = String(dateStr).split(" ");
    const dateParts = parts[0].split(".");
    
    if (dateParts.length !== 3) {
        return new Date(dateStr);
    }
    
    const d = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    
    // Jeśli mamy też godzinę, dopisujemy ją do obiektu Date
    if (parts[1]) {
        const timeParts = parts[1].split(":");
        d.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0, 0);
    } else {
        d.setHours(0, 0, 0, 0);
    }
    
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
    
    // Zczytujemy wartość z nowego filtra pracowników
    const empSelect = document.getElementById('filter-employee');
    const empFilterValue = empSelect ? empSelect.value : "ALL";

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
        
        // POBIERANIE GLOBALNEGO CELU Z GOOGLE SHEETS
        try {
            const goalResponse = await fetch(`${REPORTS_API_URL}?action=get_goal`);
            const goalData = await goalResponse.json();
            if (goalData && goalData.goal !== undefined) {
                window.currentGlobalGoal = parseFloat(goalData.goal) || 0;
                document.getElementById('goal-amount-input').value = window.currentGlobalGoal;
            }
        } catch(e) {
            console.error("Błąd pobierania celu:", e);
            window.currentGlobalGoal = 0;
        }

        // Zbieranie wszystkich unikalnych pracowników do dropdowna (z całej bazy)
        const allEmployees = new Set();
        data.forEach(row => {
            if (row.employee && row.employee.trim() !== "") {
                allEmployees.add(row.employee);
            }
        });
        
        // Aktualizowanie dropdowna (z zachowaniem zaznaczenia)
        if (empSelect) {
            empSelect.innerHTML = '<option value="ALL">Wszyscy pracownicy</option>';
            Array.from(allEmployees).sort().forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp;
                opt.innerText = emp;
                if (emp === empFilterValue) opt.selected = true;
                empSelect.appendChild(opt);
            });
        }

        let totalBuy = 0;
        let totalSell = 0;
        let totalProfit = 0; 
        
        const groupedBuy = {};
        const groupedSell = {};

        const rankingBuy = {};
        const rankingSell = {};
        
        const rawFeed = [];
        const dailyData = {}; 
        
        const dynamicBuyStats = {};
        
        // TABLICA DLA GODZIN SZCZYTU (24 godziny)
        const hourlyData = new Array(24).fill(0);

        // PIERWSZA PĘTLA: Zbieramy dane TYLKO ze skupu do ustalenia realnych kosztów (Dla całej firmy)
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

        // DRUGA PĘTLA: Główne obliczenia (Z uwzględnieniem filtra pracownika!)
        data.forEach(row => {
            const rowDate = parseDate(row.date);
            const rowTS = rowDate.getTime();
            
            if (filterStartTS && rowTS < filterStartTS) return;
            if (filterEndTS && rowTS > filterEndTS) return;

            const empName = row.employee || "Nieznany";
            
            // JEŚLI JEST WYBRANY PRACOWNIK - ODRZUCAMY RESZTĘ
            if (empFilterValue !== "ALL" && empName !== empFilterValue) return;

            // DODAJEMY DO LIVE FEED
            rawFeed.push(row);
            
            // ZLICZANIE DO GODZIN SZCZYTU (TYLKO JEŚLI DATA ZAWIERA CZAS)
            const dateStrStr = String(row.date);
            if (dateStrStr.includes('T') || dateStrStr.includes(':')) {
                const hour = rowDate.getHours();
                hourlyData[hour]++;
            }

            // PRZYGOTOWANIE DANYCH DO WYKRESU LINIOWEGO
            const dayString = rowDate.toLocaleDateString('pl-PL');
            if (!dailyData[dayString]) {
                dailyData[dayString] = { dateStr: dayString, timestamp: rowTS, buy: 0, sell: 0 };
            }

            if (row.type === "skup") {
                totalBuy += row.total;
                dailyData[dayString].buy += row.total;

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
                dailyData[dayString].sell += row.total; 
                
                let itemCost = 0;
                
                // Używamy globalnych statystyk zakupu firmy do wyliczenia marży, żeby nie oszukiwać na zysku pracownika
                if (dynamicBuyStats[row.name] && dynamicBuyStats[row.name].qty > 0) {
                    itemCost = dynamicBuyStats[row.name].total / dynamicBuyStats[row.name].qty;
                } else if (BUY_PRICES[row.name] !== undefined) {
                    itemCost = BUY_PRICES[row.name];
                } else {
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
        
        document.getElementById('total-profit').innerText = `${Math.round(totalProfit)}$`;
        document.getElementById('total-profit').style.color = totalProfit >= 0 ? 'var(--warning)' : 'var(--danger)';

        // AKTUALIZACJA CELU TYGODNIOWEGO Z UWZGLĘDNIENIEM SERWERA
        updateGoalProgress(totalSell);

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

        // ==========================================
        // PRZYGOTOWANIE DANYCH DO LIVE FEED (Wyszukiwarka)
        // ==========================================
        const prepareLiveFeed = () => {
            const groupedTransactions = {};
            
            rawFeed.forEach((item, index) => {
                const realId = item.report_id || item.reportId; 
                const key = realId ? realId : `${item.employee}_${item.date}_${item.type}`;
                
                if (!groupedTransactions[key]) {
                    groupedTransactions[key] = {
                        employee: item.employee,
                        date: item.date,
                        type: item.type,
                        id: realId || `TX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                        totalAmount: 0,
                        items: [],
                        sortIndex: index 
                    };
                }
                groupedTransactions[key].totalAmount += item.total;
                groupedTransactions[key].items.push(item);
            });

            window.globalSortedTransactions = Object.values(groupedTransactions).sort((a, b) => {
                const dateA = parseDate(a.date).getTime();
                const dateB = parseDate(b.date).getTime();
                if (dateA !== dateB) return dateB - dateA; 
                return b.sortIndex - a.sortIndex; 
            });

            window.renderLiveFeed();
        };

        prepareLiveFeed();
        
        // RENDEROWANIE WYKRESÓW
        renderCharts(groupedSell, dailyData, hourlyData);

        document.getElementById('report-timestamp').innerText = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Błąd bazy danych:", err);
        throw err; 
    }
}

// Globalna funkcja renderowania transakcji uwzględniająca wyszukiwarkę
window.renderLiveFeed = function() {
    const container = document.getElementById('activity-feed-container');
    if (!container) return;

    const searchInput = document.getElementById('feed-search-input');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtered = window.globalSortedTransactions || [];
    
    if (term) {
        filtered = filtered.filter(tx => {
            if (tx.id.toLowerCase().includes(term)) return true;
            if ((tx.employee || "").toLowerCase().includes(term)) return true;
            if (tx.type.toLowerCase().includes(term)) return true;
            if (tx.items.some(i => i.name.toLowerCase().includes(term))) return true;
            return false;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-secondary);">Brak wyników wyszukiwania dla frazy: "${term}"</div>`;
        return;
    }

    container.innerHTML = filtered.map((tx) => {
        const isBuy = tx.type === "skup";
        const actionClass = isBuy ? "buy" : "sell";
        const actionText = isBuy ? "Skup" : "Sprzedaż";
        const sign = isBuy ? "-" : "+";
        
        let displayDate = tx.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) {
            const d = new Date(displayDate);
            displayDate = d.toLocaleString('pl-PL'); 
        }
        
        return `
            <div class="feed-item" onclick="this.classList.toggle('active-feed')">
                <div class="feed-item-summary">
                    <span class="feed-id-badge">#${tx.id}</span>
                    <span class="feed-emp">${tx.employee || "Nieznany"}</span>
                    <span class="feed-action ${actionClass}">${actionText}</span>
                    <span class="feed-item-main-info">Transakcja (${tx.items.length} przedmiotów)</span>
                    <span class="feed-item-value ${actionClass}" style="color: ${isBuy ? 'var(--danger)' : 'var(--success)'}">
                        ${sign}${tx.totalAmount}$
                    </span>
                    <i class="fas fa-chevron-down feed-chevron"></i>
                </div>
                <div class="feed-item-details-block">
                    <div class="feed-details-header">
                        <span><i class="far fa-clock"></i> Czas: <strong>${displayDate}</strong></span>
                        <span>ID transakcji: <strong>${tx.id}</strong></span>
                    </div>
                    <table class="feed-details-table">
                        <thead>
                            <tr>
                                <th>Przedmiot</th>
                                <th style="text-align:center;">Ilość</th>
                                <th style="text-align:right;">Wartość</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tx.items.map(i => `
                                <tr>
                                    <td>${i.name}</td>
                                    <td style="text-align:center;">x${i.qty}</td>
                                    <td style="text-align:right;">${i.total}$</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
};

// ==========================================
// FUNKCJE CELU TYGODNIOWEGO
// ==========================================
window.updateGoalValue = function(val) {
    const goal = parseFloat(val) || 0;
    window.currentGlobalGoal = goal;
    
    // Zapisujemy nowy cel do Google Sheets
    fetch(REPORTS_API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "set_goal", goal: goal })
    }).catch(e => console.error("Błąd zapisu celu do chmury:", e));
    
    // Pobieramy aktualną sumę sprzedaży z karty KPI
    const currentSell = parseFloat(document.getElementById('total-sell').innerText.replace('$', '')) || 0;
    updateGoalProgress(currentSell);
    showNotice("Cel został zaktualizowany!", "info");
}

function updateGoalProgress(currentSell) {
    const goal = window.currentGlobalGoal || 0;
    const fill = document.getElementById('goal-progress-fill');
    const statusText = document.getElementById('goal-current-status');
    const pctText = document.getElementById('goal-percentage');

    if (goal <= 0) {
        fill.style.width = "0%";
        statusText.innerText = `Realizacja: ${currentSell}$ / Cel nieustawiony`;
        pctText.innerText = "0%";
        return;
    }

    const percentage = Math.min(Math.round((currentSell / goal) * 100), 100);
    fill.style.width = percentage + "%";
    statusText.innerText = `Realizacja: ${currentSell}$ / ${goal}$`;
    pctText.innerText = percentage + "%";

    // Zmiana kolorów paska w zależności od sukcesu
    if (percentage >= 100) {
        fill.style.background = "linear-gradient(90deg, #22c55e, #10b981)";
        fill.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.5)";
    } else {
        fill.style.background = "linear-gradient(90deg, var(--accent-color), var(--success))";
        fill.style.boxShadow = "0 0 15px var(--accent-color)";
    }
}

// ==========================================
// FUNKCJA RYSUJĄCA WYKRESY (CHART.JS)
// ==========================================
function renderCharts(groupedSell, dailyData, hourlyData) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    if (topItemsChartInstance) topItemsChartInstance.destroy();
    if (cashflowChartInstance) cashflowChartInstance.destroy();
    if (peakHoursChartInstance) peakHoursChartInstance.destroy();

    const topItems = Object.values(groupedSell)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); 
        
    const ctxTop = document.getElementById('topItemsChart').getContext('2d');
    topItemsChartInstance = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: topItems.map(item => item.name),
            datasets: [{
                label: 'Przychód ($)',
                data: topItems.map(item => item.total),
                backgroundColor: 'rgba(56, 189, 248, 0.6)',
                borderColor: '#38bdf8',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    const sortedDays = Object.values(dailyData).sort((a, b) => a.timestamp - b.timestamp);
    
    const ctxCash = document.getElementById('cashflowChart').getContext('2d');
    cashflowChartInstance = new Chart(ctxCash, {
        type: 'line',
        data: {
            labels: sortedDays.map(d => d.dateStr),
            datasets: [
                {
                    label: 'Przychody (sprzedaż)',
                    data: sortedDays.map(d => d.sell),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Wydatki (skup)',
                    data: sortedDays.map(d => d.buy),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += context.parsed.y + '$';
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // NOWE: HEATMAPA (WYKRES SŁUPKOWY GODZIN)
    // Dynamiczne kolory (im więcej transakcji, tym bardziej intensywny kolor)
    const maxTransactions = Math.max(...hourlyData) || 1;
    const dynamicColors = hourlyData.map(val => {
        if(val === 0) return 'rgba(255, 255, 255, 0.05)';
        const intensity = 0.3 + (0.7 * (val / maxTransactions)); // Od 0.3 do 1.0
        return `rgba(245, 158, 11, ${intensity})`; // Kolor warning (--warning z CSS)
    });

    const ctxPeak = document.getElementById('peakHoursChart').getContext('2d');
    peakHoursChartInstance = new Chart(ctxPeak, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Liczba operacji',
                data: hourlyData,
                backgroundColor: dynamicColors,
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ==========================================
// ZARZĄDZANIE PRACOWNIKAMI (NOWY MODUŁ)
// ==========================================

window.openEmployeeManager = async function() {
    document.getElementById('employee-manager-modal').classList.remove('hidden');
    await loadEmployeesToTable();
}

window.closeEmployeeManager = function() {
    document.getElementById('employee-manager-modal').classList.add('hidden');
}

async function loadEmployeesToTable() {
    const tbody = document.getElementById('emp-manager-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych z bazy...</td></tr>';
    
    try {
        const response = await fetch(`${PIN_API_URL}?action=get_all`);
        const data = await response.json();
        
        if (data.employees && data.employees.length > 0) {
            tbody.innerHTML = data.employees.map(emp => {
                const isBoss = emp.role && emp.role.toLowerCase() === 'szef';
                return `
                    <tr>
                        <td><strong>${emp.name}</strong></td>
                        <td style="text-align: center; color: var(--warning); letter-spacing: 5px;">****</td>
                        <td style="text-align: center;">
                            ${isBoss ? '<span class="is-boss-badge">Tak</span>' : '<span class="no-access-badge">Nie</span>'}
                        </td>
                        <td style="text-align: right;">
                            <button onclick="toggleEmployeeRole('${emp.pin}', '${isBoss ? '' : 'szef'}')" class="emp-action-btn emp-btn-role" title="Zmień uprawnienia">
                                <i class="fas fa-user-shield"></i>
                            </button>
                            <button onclick="deleteEmployee('${emp.pin}', '${emp.name}')" class="emp-action-btn emp-btn-del" title="Usuń pracownika">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak zapisanych pracowników w bazie.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Błąd połączenia z bazą!</td></tr>';
    }
}

window.addNewEmployee = async function() {
    const btn = document.getElementById('add-emp-btn');
    const nameInput = document.getElementById('new-emp-name');
    const pinInput = document.getElementById('new-emp-pin');
    const isBoss = document.getElementById('new-emp-boss').checked;
    
    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!name || !pin) return showNotice("Uzupełnij nick i PIN!", "danger");
    if (pin.length < 4) return showNotice("PIN musi mieć minimum 4 znaki!", "warning");
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const res = await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add',
                name: name,
                pin: pin,
                role: isBoss ? 'szef' : ''
            })
        });
        
        showNotice("Przetwarzanie...", "info");
        await loadEmployeesToTable();
        showNotice(`Dodano pracownika: ${name}`, "success");
        nameInput.value = '';
        pinInput.value = '';
        document.getElementById('new-emp-boss').checked = false;
        
    } catch (e) {
        showNotice("Nie udało się zapisać pracownika!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Dodaj';
    }
}

window.deleteEmployee = async function(pin, name) {
    if (!confirm(`Na pewno chcesz usunąć pracownika: ${name}?`)) return;
    
    try {
        showNotice("Usuwanie pracownika...", "info");
        await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', pin: pin })
        });
        await loadEmployeesToTable();
        showNotice("Pracownik usunięty!", "warning");
    } catch (e) {
        showNotice("Błąd usuwania!", "danger");
    }
}

window.toggleEmployeeRole = async function(pin, newRole) {
    try {
        showNotice("Zmienianie uprawnień...", "info");
        await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle_role', pin: pin, role: newRole })
        });
        await loadEmployeesToTable();
        showNotice("Zmieniono uprawnienia!", "success");
    } catch (e) {
        showNotice("Błąd zmiany uprawnień!", "danger");
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

    const totalBuyVal = document.getElementById('total-buy').innerText;
    const totalSellVal = document.getElementById('total-sell').innerText;
    const totalBalVal = document.getElementById('total-balance').innerText;
    const totalProfitVal = document.getElementById('total-profit').innerText;
    
    document.getElementById('v-buy').innerText = totalBuyVal;
    document.getElementById('v-sell').innerText = totalSellVal;
    document.getElementById('v-bal').innerText = totalBalVal;
    
    const dFrom = document.getElementById('filter-date-from').value || "POCZĄTEK";
    const dTo = document.getElementById('filter-date-to').value || "DZIŚ";
    
    const empSelectValue = document.getElementById('filter-employee').value;
    const empDisplay = empSelectValue === "ALL" ? "WSZYSCY" : empSelectValue.toUpperCase();
    document.getElementById('v-report-date').innerText = `ZAKRES: ${dFrom} — ${dTo} | ${empDisplay}`;
    
    const reportID = Math.random().toString(36).substr(2, 8).toUpperCase();
    document.getElementById('v-footer-id').innerText = `REPORT_ID: ${reportID}`;

    const topBuyRows = Array.from(document.querySelectorAll('#ranking-buy-table-body tr')).slice(0, 3);
    let topBuyStr = topBuyRows.map((r, i) => {
        const name = r.querySelector('strong') ? r.querySelector('strong').innerText : "Brak";
        const val = r.querySelector('td:last-child') ? r.querySelector('td:last-child').innerText : "0$";
        return `**${i+1}.** ${name} (${val})`;
    }).join('\n') || "Brak danych";

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
                    description: `Dokładne zestawienie operacji finansowych dla okresu:\n📅 **${dFrom} — ${dTo}**\n👤 Pracownik: **${empSelectValue === "ALL" ? "Wszyscy pracownicy" : empSelectValue}**`,
                    color: 3447003, 
                    fields: [
                        { name: "📉 Wydatki (skup)", value: `\`${totalBuyVal}\``, inline: true },
                        { name: "📈 Przychody (sprzedaż)", value: `\`${totalSellVal}\``, inline: true },
                        { name: "⚖️ Bilans", value: `\`${totalBalVal}\``, inline: true },
                        { name: "💎 Czysty zysk", value: ` 💰 ${totalProfitVal}`, inline: false },
                        { name: "🏆 Top zaopatrzeniowcy (skup)", value: topBuyStr, inline: true },
                        { name: "🚚 Top sprzedający (sprzedaż)", value: topSellStr, inline: true }
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
    if(type === 'info') colorClass = 'info';

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
    
    // Podpięcie wyszukiwarki na żywo
    const feedSearchInput = document.getElementById('feed-search-input');
    if (feedSearchInput) {
        feedSearchInput.addEventListener('input', () => {
            if (window.renderLiveFeed) window.renderLiveFeed();
        });
    }
});

// FUNKCJA ZWIJANIA TABEL
window.toggleTable = function(id, header) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('collapsed-table');
        header.classList.toggle('collapsed');
    }
};

// ==========================================
// SYSTEM AUTOMATYCZNEJ AKTUALIZACJI STRONY
// ==========================================
async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        console.log(`[SYSTEM] Wersja lokalna: ${APP_VERSION} | Wersja na serwerze: ${serverVersion}`);
        if (serverVersion !== APP_VERSION) {
            showUpdatePrompt();
        }
    } catch (e) {
        // Ciche ignorowanie błędu
    }
}

function showUpdatePrompt() {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt';
    div.className = 'update-notify';
    div.innerHTML = `
        <span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję systemu!</span>
        <button class="update-btn-refresh" onclick="forceHardReload()">Odśwież</button>
    `;
    document.body.appendChild(div);
}

window.forceHardReload = async function() {
    console.log("[SYSTEM] Inicjowanie twardego przeładowania...");
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