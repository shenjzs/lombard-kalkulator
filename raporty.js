// ==========================================
// WERSJA APLIKACJI (Zmień, aby wymusić odświeżenie u wszystkich)
// ==========================================
const APP_VERSION = "3.3.8"; // Podbito wersję (Formatowanie kasy ze spacjami)

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
window.currentEmployeesList = []; // Lista pracowników do edycji
let currentEmployeeName = "";
let currentFeedLimit = 50; // LIMIT WYŚWIETLANIA DLA LIVE FEEDA

// ==========================================
// FUNKCJA FORMATOWANIA WALUTY (np. 150000 -> 150 000)
// ==========================================
window.formatMoney = function(amount) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// ==========================================
// SCROLL NAVBAR LISTENER (Smart Navbar) & SCROLL TO TOP
// ==========================================
document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    const scrollBtn = document.getElementById('scrollToTopBtn');
    
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    if (scrollBtn) {
        if (window.scrollY > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }
});

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
            if (data.role && data.role.toLowerCase().trim() === 'szef') {
                currentEmployeeName = data.name;
                document.getElementById('logged-boss-name').innerText = currentEmployeeName.toUpperCase();
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('dashboard-screen').classList.remove('hidden');
                document.getElementById('user-profile').classList.remove('hidden');
                showNotice(`Zalogowano pomyślnie jako ${data.name}`, "success");
                
                loadRealData(); 
            } else {
                showNotice("Odmowa! Brak uprawnień zarządcy.", "danger");
                document.getElementById('boss-pin-input').value = ""; 
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

window.logoutBoss = function() {
    currentEmployeeName = "";
    document.getElementById('boss-pin-input').value = "";
    document.getElementById('logged-boss-name').innerText = "---";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('user-profile').classList.add('hidden');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('user-dropdown').classList.remove('active');
}

window.toggleUserMenu = function() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const profile = document.getElementById('user-profile');
    const dropdown = document.getElementById('user-dropdown');
    if (profile && dropdown && !profile.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// ==========================================
// ANIMACJA NABIJANIA LICZNIKA (COUNTUP - GTA HEIST STYLE)
// ==========================================
window.animateCountUp = function(element, targetValue, duration = 1500) {
    let startValue = 0;
    const isNegative = targetValue < 0;
    const absTarget = Math.abs(targetValue);
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // easeOutQuart - szybki start, powolne hamowanie na końcu
        const easeProgress = 1 - Math.pow(1 - progress, 5);
        const currentVal = Math.floor(easeProgress * absTarget);
        
        const displayValue = isNegative ? -currentVal : currentVal;
        
        // Zabezpieczenie przed pokazaniem -0
        if (displayValue === 0 && isNegative) {
            element.innerText = `0$`;
        } else {
            element.innerText = `${window.formatMoney(displayValue)}$`;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.innerText = `${window.formatMoney(targetValue)}$`; 
        }
    };
    window.requestAnimationFrame(step);
};

// ==========================================
// ANALIZA I FILTROWANIE DANYCH
// ==========================================

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.includes("T")) {
        return new Date(dateStr); 
    }
    const parts = String(dateStr).split(" ");
    const dateParts = parts[0].split(".");
    if (dateParts.length !== 3) return new Date(dateStr);
    const d = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
    if (parts[1]) {
        const timeParts = parts[1].split(":");
        d.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0, 0);
    } else {
        d.setHours(0, 0, 0, 0);
    }
    return d;
}

function getFormattedDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

window.applyFilter = function() {
    const btn = document.getElementById('ok-filter-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    loadRealData().then(() => {
        btn.innerHTML = 'OK';
        showNotice("Dane zostały pomyślnie przefiltrowane!", "success");
    });
}

window.refreshPage = function() {
    const icon = document.getElementById('refresh-icon');
    if(icon) icon.classList.add('fa-spin');
    
    loadRealData().then(() => {
        if(icon) icon.classList.remove('fa-spin');
        showNotice("Statystyki zostały zaktualizowane!", "success");
    }).catch(err => {
        if(icon) icon.classList.remove('fa-spin');
        showNotice("Błąd podczas odświeżania statystyk!", "danger");
    });
}

async function loadRealData() {
    // ------------------------------------------------------------------
    // WSTRZYKIWANIE SKELETONÓW PRZED POBRANIEM DANYCH
    // ------------------------------------------------------------------
    const kpiSkeleton = '<div class="skeleton" style="height: 30px; width: 60%; margin: 5px 0; border-radius: 6px;"></div>';
    document.getElementById('total-buy').innerHTML = kpiSkeleton;
    document.getElementById('total-sell').innerHTML = kpiSkeleton;
    document.getElementById('total-balance').innerHTML = kpiSkeleton;
    document.getElementById('total-profit').innerHTML = kpiSkeleton;

    const tableSkeleton = Array(5).fill(`
        <tr>
            <td><div class="skeleton" style="height: 16px; width: 80%; border-radius: 4px;"></div></td>
            <td style="text-align:center;"><div class="skeleton" style="height: 16px; width: 40%; margin: 0 auto; border-radius: 4px;"></div></td>
            <td style="text-align:right;"><div class="skeleton" style="height: 16px; width: 60%; margin-left: auto; border-radius: 4px;"></div></td>
        </tr>
    `).join('');
    
    document.getElementById('buy-table-body').innerHTML = tableSkeleton;
    document.getElementById('sell-table-body').innerHTML = tableSkeleton;
    document.getElementById('ranking-buy-table-body').innerHTML = tableSkeleton;
    document.getElementById('ranking-sell-table-body').innerHTML = tableSkeleton;

    const feedSkeleton = Array(5).fill(`
        <div class="feed-item" style="padding: 18px 30px; display: flex; align-items: center; gap: 15px;">
            <div class="skeleton" style="width: 80px; height: 22px; border-radius: 6px;"></div>
            <div class="skeleton" style="width: 130px; height: 16px; border-radius: 4px;"></div>
            <div class="skeleton" style="width: 95px; height: 16px; border-radius: 4px;"></div>
            <div class="skeleton" style="flex-grow: 1; height: 16px; border-radius: 4px;"></div>
            <div class="skeleton" style="width: 80px; height: 20px; border-radius: 4px;"></div>
        </div>
    `).join('');
    document.getElementById('activity-feed-container').innerHTML = feedSkeleton;
    // ------------------------------------------------------------------

    const dateFromValue = document.getElementById('filter-date-from').value;
    const dateToValue = document.getElementById('filter-date-to').value;
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
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        
        // Filtrujemy tylko to co związane z kasą (skup i sprzedaż)
        const data = rawData.filter(row => row.type === "skup" || row.type === "sprzedaz");
        
        try {
            const goalResponse = await fetch(`${REPORTS_API_URL}?action=get_goal&t=${new Date().getTime()}`);
            const goalData = await goalResponse.json();
            if (goalData && goalData.goal !== undefined) {
                window.currentGlobalGoal = parseFloat(goalData.goal) || 0;
                document.getElementById('goal-amount-input').value = window.currentGlobalGoal;
            }
        } catch(e) {
            window.currentGlobalGoal = 0;
        }

        const allEmployees = new Set();
        data.forEach(row => {
            if (row.employee && row.employee.trim() !== "") {
                allEmployees.add(row.employee);
            }
        });
        
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
        const hourlyData = new Array(24).fill(0);

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

        data.forEach(row => {
            const rowDate = parseDate(row.date);
            const rowTS = rowDate.getTime();
            
            if (filterStartTS && rowTS < filterStartTS) return;
            if (filterEndTS && rowTS > filterEndTS) return;

            const empName = row.employee || "Nieznany";
            
            if (empFilterValue !== "ALL" && empName !== empFilterValue) return;

            rawFeed.push(row);
            
            const dateStrStr = String(row.date);
            if (dateStrStr.includes('T') || dateStrStr.includes(':')) {
                const hour = rowDate.getHours();
                hourlyData[hour]++;
            }

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

                if (!rankingBuy[empName]) rankingBuy[empName] = { name: empName, totalBuyVal: 0 };
                rankingBuy[empName].totalBuyVal += row.total;

            } else if (row.type === "sprzedaz") {
                totalSell += row.total;
                dailyData[dayString].sell += row.total; 
                
                let itemCost = 0;
                
                if (dynamicBuyStats[row.name] && dynamicBuyStats[row.name].qty > 0) {
                    itemCost = dynamicBuyStats[row.name].total / dynamicBuyStats[row.name].qty;
                } else {
                    itemCost = (row.total / row.qty) * 0.8;
                }
                
                let itemProfit = row.total - (itemCost * row.qty);
                totalProfit += itemProfit;

                if (!groupedSell[row.name]) groupedSell[row.name] = { name: row.name, qty: 0, total: 0 };
                groupedSell[row.name].qty += row.qty;
                groupedSell[row.name].total += row.total;
                
                if (!rankingSell[empName]) rankingSell[empName] = { name: empName, totalSellVal: 0 };
                rankingSell[empName].totalSellVal += row.total;
            }
        });

        animateCountUp(document.getElementById('total-buy'), totalBuy);
        animateCountUp(document.getElementById('total-sell'), totalSell);
        
        let balance = totalSell - totalBuy;
        const balEl = document.getElementById('total-balance');
        balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
        animateCountUp(balEl, balance);
        
        const profEl = document.getElementById('total-profit');
        profEl.style.color = totalProfit >= 0 ? 'var(--warning)' : 'var(--danger)';
        animateCountUp(profEl, Math.round(totalProfit));

        updateGoalProgress(totalSell);

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
                        ${isExpense ? '-' : '+'}${window.formatMoney(item.total)}$
                    </td>
                </tr>
            `).join('');
        };

        renderRows('buy-table-body', groupedBuy, true);
        renderRows('sell-table-body', groupedSell, false);
        
        const renderBuyRanking = () => {
            const tbody = document.getElementById('ranking-buy-table-body');
            const rankingItems = Object.values(rankingBuy).sort((a,b) => b.totalBuyVal - a.totalBuyVal);
            
            if (rankingItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak aktywności skupu</td></tr>`;
                return;
            }
            
            tbody.innerHTML = rankingItems.map((item, index) => `
                <tr>
                    <td style="width: 80px;"><span class="rank-badge">#${index + 1}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: right; color: var(--accent-color); font-weight: 800;">
                        ${window.formatMoney(item.totalBuyVal)}$
                    </td>
                </tr>
            `).join('');
        };

        const renderSellRanking = () => {
            const tbody = document.getElementById('ranking-sell-table-body');
            const rankingItems = Object.values(rankingSell).sort((a,b) => b.totalSellVal - a.totalSellVal);
            
            if (rankingItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-secondary);">Brak aktywności sprzedaży</td></tr>`;
                return;
            }
            
            tbody.innerHTML = rankingItems.map((item, index) => `
                <tr>
                    <td style="width: 80px;"><span class="rank-badge">#${index + 1}</span></td>
                    <td><strong>${item.name}</strong></td>
                    <td style="text-align: right; color: var(--success); font-weight: 800;">
                        +${window.formatMoney(item.totalSellVal)}$
                    </td>
                </tr>
            `).join('');
        };

        renderBuyRanking();
        renderSellRanking();

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

            currentFeedLimit = 50; 
            window.renderLiveFeed();
        };

        prepareLiveFeed();
        renderCharts(groupedSell, dailyData, hourlyData);
        document.getElementById('report-timestamp').innerText = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        console.error("Błąd bazy danych:", err);
    }
}

// ------------------------------------------
// LIVE FEED RENDER Z LIMITOWANIEM
// ------------------------------------------
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

    const itemsToRender = filtered.slice(0, currentFeedLimit);

    let html = itemsToRender.map((tx) => {
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
                        ${sign}${window.formatMoney(tx.totalAmount)}$
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
                                    <td style="text-align:right;">${window.formatMoney(i.total)}$</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    if (filtered.length > currentFeedLimit) {
        const remaining = filtered.length - currentFeedLimit;
        html += `
            <div style="padding: 15px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                <button onclick="loadMoreFeed()" class="load-more-btn">
                    <i class="fas fa-chevron-down"></i> Pokaż starsze operacje (ukryte: ${remaining})
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
};

window.loadMoreFeed = function() {
    currentFeedLimit += 50;
    window.renderLiveFeed();
};

window.updateGoalValue = function(val) {
    const goal = parseFloat(val) || 0;
    window.currentGlobalGoal = goal;
    
    fetch(REPORTS_API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "set_goal", goal: goal })
    }).catch(e => console.error("Błąd zapisu celu do chmury:", e));
    
    const currentSell = parseFloat(document.getElementById('total-sell').innerText.replace(/\s|\$/g, '')) || 0;
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
        statusText.innerText = `Realizacja: ${window.formatMoney(currentSell)}$ / Cel nieustawiony`;
        pctText.innerText = "0%";
        return;
    }

    const percentage = Math.min(Math.round((currentSell / goal) * 100), 100);
    fill.style.width = percentage + "%";
    statusText.innerText = `Realizacja: ${window.formatMoney(currentSell)}$ / ${window.formatMoney(goal)}$`;
    pctText.innerText = percentage + "%";

    if (percentage >= 100) {
        fill.style.background = "linear-gradient(90deg, #22c55e, #10b981)";
        fill.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.5)";
    } else {
        fill.style.background = "linear-gradient(90deg, var(--accent-color), var(--success))";
        fill.style.boxShadow = "0 0 15px var(--accent-color)";
    }
}

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
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
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
            interaction: { mode: 'index', intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += window.formatMoney(context.parsed.y) + '$';
                            return label;
                        }
                    }
                }
            },
            scales: { y: { beginAtZero: true } }
        }
    });

    const maxTransactions = Math.max(...hourlyData) || 1;
    const dynamicColors = hourlyData.map(val => {
        if(val === 0) return 'rgba(255, 255, 255, 0.05)';
        const intensity = 0.3 + (0.7 * (val / maxTransactions));
        return `rgba(245, 158, 11, ${intensity})`; 
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
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ==========================================
// ZARZĄDZANIE PRACOWNIKAMI
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
    
    // Wstrzyknięcie skeletonów do tabeli pracowników
    const empSkeletonHTML = Array(4).fill(`
        <tr>
            <td><div class="skeleton" style="height: 16px; width: 120px; border-radius: 4px;"></div></td>
            <td style="text-align:center;"><div class="skeleton" style="height: 22px; width: 80px; margin: 0 auto; border-radius: 6px;"></div></td>
            <td style="text-align:center;"><div class="skeleton" style="height: 20px; width: 40px; margin: 0 auto; border-radius: 6px;"></div></td>
            <td style="text-align:right;">
                <div style="display: flex; justify-content: flex-end; gap: 5px;">
                    <div class="skeleton" style="width: 34px; height: 34px; border-radius: 8px;"></div>
                    <div class="skeleton" style="width: 34px; height: 34px; border-radius: 8px;"></div>
                    <div class="skeleton" style="width: 34px; height: 34px; border-radius: 8px;"></div>
                </div>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = empSkeletonHTML;
    
    try {
        const response = await fetch(`${PIN_API_URL}?action=get_all`);
        const data = await response.json();
        
        if (data.employees && data.employees.length > 0) {
            window.currentEmployeesList = data.employees; 

            tbody.innerHTML = data.employees.map(emp => {
                const isBoss = emp.role && emp.role.toLowerCase() === 'szef';
                const rankDisplay = emp.rank ? emp.rank : "Pracownik";
                return `
                    <tr>
                        <td><strong>${emp.name}</strong></td>
                        <td style="text-align: center;">
                            <span class="emp-rank-badge">${rankDisplay}</span>
                        </td>
                        <td style="text-align: center;">
                            ${isBoss ? '<span class="is-boss-badge">Tak</span>' : '<span class="no-access-badge">Nie</span>'}
                        </td>
                        <td style="text-align: right;">
                            <button onclick="openEditEmployee('${emp.pin}')" class="emp-action-btn" style="color: var(--accent-color); border-color: rgba(56, 189, 248, 0.3);" title="Edytuj dane">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
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
            window.currentEmployeesList = [];
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak zapisanych pracowników w bazie.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Błąd połączenia z bazą!</td></tr>';
    }
}

// ------------------------------------------
// EDYCJA DANYCH PRACOWNIKA (MODAL)
// ------------------------------------------
window.openEditEmployee = function(pin) {
    const emp = window.currentEmployeesList.find(e => e.pin === pin);
    if (!emp) return showNotice("Błąd: Nie znaleziono pracownika!", "danger");

    document.getElementById('edit-emp-pin').value = emp.pin;
    document.getElementById('edit-emp-name').value = emp.name;
    document.getElementById('edit-emp-rank').value = emp.rank || "Pracownik";
    document.getElementById('edit-emp-ssn').value = emp.ssn || "";
    document.getElementById('edit-emp-photo').value = emp.photo || "";

    document.getElementById('edit-employee-modal').classList.remove('hidden');
}

window.closeEditEmployee = function() {
    document.getElementById('edit-employee-modal').classList.add('hidden');
}

window.saveEmployeeEdit = async function() {
    const btn = document.getElementById('save-edit-emp-btn');
    const pin = document.getElementById('edit-emp-pin').value;
    const rank = document.getElementById('edit-emp-rank').value;
    const ssn = document.getElementById('edit-emp-ssn').value;
    const photo = document.getElementById('edit-emp-photo').value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        const res = await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'edit_employee', 
                pin: pin, 
                rank: rank, 
                ssn: ssn, 
                photo: photo 
            })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotice("Dane pracownika zostały zaktualizowane!", "success");
            closeEditEmployee();
            await loadEmployeesToTable();
        } else {
            showNotice("Błąd zapisywania danych!", "danger");
        }
    } catch (e) {
        showNotice("Błąd połączenia z serwerem!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Zapisz zmiany';
    }
}
// ------------------------------------------

window.addNewEmployee = async function() {
    const btn = document.getElementById('add-emp-btn');
    const nameInput = document.getElementById('new-emp-name');
    const pinInput = document.getElementById('new-emp-pin');
    const rankInput = document.getElementById('new-emp-rank'); 
    const isBoss = document.getElementById('new-emp-boss').checked;
    
    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();
    const rank = rankInput ? rankInput.value : "Pracownik";
    
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
                role: isBoss ? 'szef' : '',
                rank: rank  
            })
        });
        
        showNotice("Przetwarzanie...", "info");
        await loadEmployeesToTable();
        showNotice(`Dodano pracownika: ${name}`, "success");
        nameInput.value = '';
        pinInput.value = '';
        document.getElementById('new-emp-boss').checked = false;
        if(rankInput) rankInput.value = "Pracownik"; 
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
        await fetch(PIN_API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', pin: pin }) });
        await loadEmployeesToTable();
        showNotice("Pracownik usunięty!", "warning");
    } catch (e) { showNotice("Błąd usuwania!", "danger"); }
}

window.toggleEmployeeRole = async function(pin, newRole) {
    try {
        showNotice("Zmienianie uprawnień...", "info");
        await fetch(PIN_API_URL, { method: 'POST', body: JSON.stringify({ action: 'toggle_role', pin: pin, role: newRole }) });
        await loadEmployeesToTable();
        showNotice("Zmieniono uprawnienia!", "success");
    } catch (e) { showNotice("Błąd zmiany uprawnień!", "danger"); }
}

// ==========================================
// GENEROWANIE RAPORTU GRAFICZNEGO I DISCORD
// ==========================================
window.sendReportToDiscord = async function() {
    const btn = document.getElementById('send-report-btn');
    const area = document.getElementById('report-visual-card');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';
    }

    const totalBuyVal = document.getElementById('total-buy').innerText;
    const totalSellVal = document.getElementById('total-sell').innerText;
    const totalBalVal = document.getElementById('total-balance').innerText;
    const totalProfitVal = document.getElementById('total-profit').innerText;
    
    document.getElementById('v-buy').innerText = totalBuyVal;
    document.getElementById('v-sell').innerText = totalSellVal;
    document.getElementById('v-bal').innerText = totalBalVal;
    
    const dFrom = document.getElementById('filter-date-from') ? document.getElementById('filter-date-from').value : "POCZĄTEK";
    const dTo = document.getElementById('filter-date-to') ? document.getElementById('filter-date-to').value : "DZIŚ";
    
    const empSelectValue = document.getElementById('filter-employee') ? document.getElementById('filter-employee').value : "ALL";
    const empDisplay = empSelectValue === "ALL" ? "WSZYSCY" : empSelectValue.toUpperCase();
    document.getElementById('v-report-date').innerText = `ZAKRES: ${dFrom || "POCZĄTEK"} — ${dTo || "DZIŚ"} | ${empDisplay}`;
    
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
        
        if (rows.length === 0 || rows[0].innerText.includes("Brak danych") || rows[0].innerHTML.includes("skeleton")) {
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
                    description: `Dokładne zestawienie operacji finansowych dla okresu:\n📅 **${dFrom || "Początek"} — ${dTo || "Dziś"}**\n👤 Pracownik: **${empSelectValue === "ALL" ? "Wszyscy pracownicy" : empSelectValue}**`,
                    color: 3447003, 
                    fields: [
                        { name: "📉 Wydatki (skup)", value: `\`${totalBuyVal}\``, inline: true },
                        { name: "📈 Przychody (sprzedaż)", value: `\`${totalSellVal}\``, inline: true },
                        { name: "⚖️ Bilans", value: `\`${totalBalVal}\``, inline: true },
                        { name: "💎 Czysty zysk", value: ` 💰 ${totalProfitVal}`, inline: false },
                        { name: "🏆 Top zaopatrzeniowcy", value: topBuyStr, inline: true },
                        { name: "🚚 Top sprzedający", value: topSellStr, inline: true }
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
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij raport na kanał';
        }
    }
}

// ==========================================
// POWIADOMIENIA I EVENTY
// ==========================================
window.showNotice = function(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 300); 
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('boss-pin-input');
    if (pinInput) { 
        pinInput.addEventListener('keypress', e => { 
            if (e.key === 'Enter') loginBoss(); 
        }); 
    }
    
    const feedSearchInput = document.getElementById('feed-search-input');
    if (feedSearchInput) {
        feedSearchInput.addEventListener('input', () => {
            currentFeedLimit = 50; 
            if (window.renderLiveFeed) window.renderLiveFeed();
        });
    }

    // ==========================================
    // SCROLL TO TOP BUTTON WSTRZYKIWANIE
    // ==========================================
    const scrollBtnHTML = `
        <button id="scrollToTopBtn" class="scroll-to-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" title="Wróć na górę">
            <i class="fas fa-arrow-up"></i>
        </button>
    `;
    document.body.insertAdjacentHTML('beforeend', scrollBtnHTML);
});

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
            if (localStorage.getItem('update_ignored_version') === serverVersion) {
                return;
            }
            showUpdatePrompt(serverVersion);
        }
    } catch (e) {
    }
}

function showUpdatePrompt(serverVersion) {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt';
    div.className = 'update-notify';
    div.innerHTML = `
        <span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję systemu!</span>
        <button class="update-btn-refresh" onclick="forceHardReload('${serverVersion}')">Odśwież</button>
    `;
    document.body.appendChild(div);
}

window.forceHardReload = async function(serverVersion) {
    console.log("[SYSTEM] Inicjowanie twardego przeładowania...");
    if (serverVersion) {
        localStorage.setItem('update_ignored_version', serverVersion);
    }
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