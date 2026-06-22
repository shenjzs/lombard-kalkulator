// ==========================================
// WERSJA APLIKACJI (Zmień, aby wymusić odświeżenie u wszystkich)
// ==========================================
const APP_VERSION = "4.5.7"; // Normalizacja nazw produktów

// ==========================================
// KONFIGURACJA LINKÓW I CEN
// ==========================================
const PIN_API_URL = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/pin";
const REPORTS_API_URL = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports";
const BOSS_DISCORD_WEBHOOK = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/boss";

// ZMIENNE GLOBALNE DLA WYKRESÓW I CELU
let topItemsChartInstance = null;
let cashflowChartInstance = null;
let peakHoursChartInstance = null; 
let bonusesChartInstance = null;
let productDetailsChartInstance = null; // Wykres w oknie produktu
window.currentGlobalGoal = 0;

// Globalna zmienna przechowująca przetworzone dane dla wyszukiwarki
window.globalSortedTransactions = [];
window.currentEmployeesList = []; // Lista pracowników do edycji
window.globalRawFeed = []; // Globalne logi do profili pracownika
window.currentFilteredFeed = []; // Tabela z danymi tylko z obecnego filtru (do statystyk przedmiotów)
window.globalBonuses = []; // Globalne premie
window.globalLoyaltyData = []; // Baza klientów (pieczątki)
window.globalSystemLogs = []; // Globalne logi systemowe
let currentEmployeeName = "";
let currentFeedLimit = 50; // LIMIT WYŚWIETLANIA DLA LIVE FEEDA

// INTELIGENTNY PRE-LOADING W TLE (Predictive Fetch)
window.reportsFetchPromise = null;
window.bonusesFetchPromise = null;
window.loyaltyFetchPromise = null;
window.loyaltySettingsFetchPromise = null;
window.employeesFetchPromise = null;
window.logsFetchPromise = null;

window.preloadReportsData = function() {
    if (!window.reportsFetchPromise) {
        window.reportsFetchPromise = fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.reportsFetchPromise = null; return []; });
    }
    return window.reportsFetchPromise;
};

window.preloadBonusesData = function() {
    if (!window.bonusesFetchPromise) {
        window.bonusesFetchPromise = fetch(`${REPORTS_API_URL}?action=get_bonuses&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.bonusesFetchPromise = null; return { bonuses: [] }; });
    }
    return window.bonusesFetchPromise;
};

window.preloadLoyaltyData = function() {
    if (!window.loyaltyFetchPromise) {
        window.loyaltyFetchPromise = fetch(`${REPORTS_API_URL}?action=get_loyalty&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.loyaltyFetchPromise = null; return { loyalty: [] }; });
    }
    return window.loyaltyFetchPromise;
};

window.preloadLoyaltySettingsData = function() {
    if (!window.loyaltySettingsFetchPromise) {
        window.loyaltySettingsFetchPromise = fetch(`${REPORTS_API_URL}?action=get_loyalty_settings&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.loyaltySettingsFetchPromise = null; return {}; });
    }
    return window.loyaltySettingsFetchPromise;
};

window.preloadEmployeesData = function() {
    if (!window.employeesFetchPromise) {
        window.employeesFetchPromise = fetch(`${PIN_API_URL}?action=get_all&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.employeesFetchPromise = null; return { employees: [] }; });
    }
    return window.employeesFetchPromise;
};

window.preloadLogsData = function() {
    if (!window.logsFetchPromise) {
        window.logsFetchPromise = fetch(`${REPORTS_API_URL}?action=get_logs&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => { window.logsFetchPromise = null; return { logs: [] }; });
    }
    return window.logsFetchPromise;
};

// ==========================================
// FUNKCJA ZAPISU LOGÓW SYSTEMOWYCH
// ==========================================
window.addSystemLog = async function(type, description) {
    const who = currentEmployeeName || "Nieznany szef";
    
    // Generujemy polski czas z przeglądarki
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const localDate = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // <--- DODANY NAGŁÓWEK
            body: JSON.stringify({
                action: 'save_log',
                date: localDate, // <--- LOKALNY CZAS ZAMIAST CZASU SERWERA
                employee: who,
                type: type,
                description: description
            })
        });
        // Czyścimy cache logów, aby pobrały się świeże przy otwarciu panelu
        window.logsFetchPromise = null;
    } catch (e) {
        console.error("Błąd zapisu logu systemowego:", e);
    }
};

// ==========================================
// FUNKCJA FORMATOWANIA WALUTY (np. 150000 -> 150 000)
// ==========================================
window.formatMoney = function(amount) {
    if (isNaN(amount)) return "0";
    // Używamy \u00A0 (twardej spacji), żeby liczby nigdy nie łamały się do nowej linii!
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
};

// ==========================================
// FUNKCJA NORMALIZACJI NAZW (Naprawa wielkości liter)
// ==========================================
window.normalizeItemName = function(name) {
    if (!name) return "Nieznany przedmiot";
    let trimmed = name.trim();
    if (trimmed.length === 0) return "Brak nazwy";
    // Zamienia "zIeloNy PENDRIVE" na "Zielony pendrive"
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
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
                
                // --- SYSTEM ZAPAMIĘTYWANIA PROFILU ---
                const rememberMeCheckbox = document.getElementById('remember-me-checkbox');
                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    let savedProfiles = JSON.parse(localStorage.getItem('elcartel_boss_profiles') || '[]');
                    savedProfiles = savedProfiles.filter(p => p.name !== data.name);
                    savedProfiles.push({ 
                        name: data.name, 
                        pin: pin, 
                        photo: data.photo || '',
                        ssn: data.ssn || '---',
                        dateZatrudnienia: data.dateZatrudnienia || 'Brak danych',
                        rank: data.rank || 'Pracownik' // <--- TUTAJ: pobieramy faktyczny stopień z bazy
                    });
                    localStorage.setItem('elcartel_boss_profiles', JSON.stringify(savedProfiles));
                    if (typeof renderSavedProfiles === 'function') renderSavedProfiles();
                }
                // ------------------------------------
                
                // --- EFEKT FACE ID (otwieranie kłódki) ---
                const mainIcon = document.querySelector('.login-icon');
                if (mainIcon) {
                    mainIcon.classList.remove('fa-lock', 'fa-user-shield');
                    mainIcon.classList.add('fa-unlock', 'icon-unlock-anim');
                }

                setTimeout(() => {
                    currentEmployeeName = data.name;
                    document.getElementById('logged-boss-name').innerText = currentEmployeeName.toUpperCase();
                    
                    // DODANIE LOGU DO SYSTEMU
                    window.addSystemLog('LOGOWANIE', `Zalogowano do panelu statystyk (IP/Urządzenie zweryfikowane).`);

                    // --- ANIMACJA LOGOWANIA ---
                    const loginCard = document.querySelector('.login-card');
                    loginCard.classList.add('login-zoom-in');
                    
                    setTimeout(() => {
                        document.getElementById('login-screen').classList.remove('active');
                        loginCard.classList.remove('login-zoom-in');
                        btn.disabled = false;
                        btn.innerHTML = 'Zaloguj <i class="fas fa-unlock"></i>';
                        
                        // URUCHOMIENIE NOWEGO EKRANU ŁADOWANIA
                        const loader = document.getElementById('global-loading-screen');
                        const loaderStatus = document.getElementById('loader-status');
                        if (loader) loader.classList.remove('hidden');
                        if (loaderStatus) loaderStatus.innerText = "Kompilacja danych analitycznych...";
                        
                        // Wejście głównego panelu w tło (jeszcze ukrytego pod loaderem)
                        const dashboard = document.getElementById('dashboard-screen');
                        dashboard.classList.remove('hidden');
                        dashboard.classList.add('app-zoom-out');
                        
                        document.getElementById('user-profile').classList.remove('hidden');
                        showNotice(`Zalogowano pomyślnie jako ${data.name}`, "success");
                        
                        window.preloadEmployeesData().then(d => { if(d.employees) window.currentEmployeesList = d.employees; });

                        // KLUCZOWE: Czekamy na przetworzenie tabel i wykresów
                        loadRealData().then(() => {
                            if (loaderStatus) loaderStatus.innerText = "Autoryzacja zakończona";
                            
                            // Miękkie zdjęcie loadera po załadowaniu wszystkiego
                            setTimeout(() => {
                                if (loader) loader.classList.add('hidden');
                                dashboard.classList.remove('app-zoom-out');
                            }, 600); // 600ms, żeby animacja nie urwała się zbyt brutalnie
                        }).catch(() => {
                            // W razie błędu awaryjnie wpuszczamy do panelu, żeby uniknąć wiecznego loadingu
                            if (loader) loader.classList.add('hidden');
                            dashboard.classList.remove('app-zoom-out');
                            showNotice("Uwaga: Wystąpił problem przy ładowaniu statystyk.", "danger");
                        });
                        
                    }, 400);
                }, 600);
                
            } else {
                showNotice("Odmowa! Brak uprawnień zarządcy.", "danger");
                document.getElementById('boss-pin-input').value = ""; 
                
                // --- EFEKT BŁĘDNEGO PINU (trzęsienie) ---
                const mainIcon = document.querySelector('.login-icon');
                if (mainIcon) {
                    mainIcon.classList.add('icon-shake-anim');
                    setTimeout(() => mainIcon.classList.remove('icon-shake-anim'), 400);
                }
            }
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
            
            // --- EFEKT BŁĘDNEGO PINU (trzęsienie) ---
            const mainIcon = document.querySelector('.login-icon');
            if (mainIcon) {
                mainIcon.classList.add('icon-shake-anim');
                setTimeout(() => mainIcon.classList.remove('icon-shake-anim'), 400);
            }
        }
    } catch (e) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
    } finally {
        if (!document.querySelector('.login-card').classList.contains('login-zoom-in')) {
            btn.disabled = false;
            btn.innerHTML = 'Zaloguj <i class="fas fa-unlock"></i>';
        }
    }
}

window.logoutBoss = function() {
    const dashboard = document.getElementById('dashboard-screen');
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const mainIcon = document.querySelector('.login-icon');

    // DODANIE LOGU DO SYSTEMU
    window.addSystemLog('WYLOGOWANIE', `Wylogowano bezpiecznie z panelu zarządzania.`);

    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('user-profile').classList.add('hidden');

    dashboard.classList.remove('app-zoom-out');
    dashboard.classList.add('app-zoom-in');

    setTimeout(() => {
        dashboard.classList.add('hidden');
        dashboard.classList.remove('app-zoom-in');

        loginScreen.classList.add('active');
        loginCard.classList.add('login-zoom-out');

        // Zostawiamy otwartą kłódkę na czas wjazdu karty
        if (mainIcon) {
            mainIcon.className = 'fas fa-unlock login-icon';
            
            setTimeout(() => {
                mainIcon.className = 'fas fa-lock login-icon icon-lock-anim';
                setTimeout(() => mainIcon.classList.remove('icon-lock-anim'), 500);
            }, 550);
        }

        currentEmployeeName = "";
        document.getElementById('logged-boss-name').innerText = "---";
        
        // --- ZAPISANE PROFILE ---
        document.getElementById('boss-pin-input').value = "";
        if (typeof renderSavedProfiles === 'function') renderSavedProfiles();
        // ------------------------------------

        setTimeout(() => loginCard.classList.remove('login-zoom-out'), 450);
        showNotice("Pomyślnie wylogowano z systemu.", "info");
    }, 400);
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

window.applyFilter = function() {
    const btn = document.getElementById('ok-filter-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Zmuszamy do pobrania na nowo przy filtrze
    window.reportsFetchPromise = null;
    
    loadRealData().then(() => {
        btn.innerHTML = 'OK';
        showNotice("Dane zostały pomyślnie przefiltrowane!", "success");
    });
}

window.refreshPage = function() {
    const icon = document.getElementById('refresh-icon');
    if(icon) icon.classList.add('fa-spin');
    
    // Zmuszamy do pobrania na nowo przy odświeżeniu
    window.reportsFetchPromise = null;
    window.bonusesFetchPromise = null;
    window.loyaltyFetchPromise = null;
    window.employeesFetchPromise = null;
    
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
    
    const totalBonusesEl = document.getElementById('total-bonuses');
    if (totalBonusesEl) totalBonusesEl.innerHTML = kpiSkeleton;

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
            <div class="flex-grow: 1; height: 16px; border-radius: 4px;"></div>
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
        let rawData = await window.preloadReportsData();
        
        // NORMALIZACJA NAZW PRZEDMIOTÓW (likwidacja literówek i wielkich liter)
        rawData.forEach(row => {
            if (row.name) {
                row.name = window.normalizeItemName(row.name);
            }
        });
        
        // Zapis globalny do wyliczania statystyk pracownika na kliknięcie
        window.globalRawFeed = rawData;
        
        // Pobieranie premii z bazy
        try {
            const bonusesData = await window.preloadBonusesData();
            window.globalBonuses = bonusesData.bonuses || [];
        } catch(e) {
            window.globalBonuses = [];
        }

        // POBIERANIE BAZY KLIENTÓW (Karty lojalnościowe)
        try {
            const loyaltyData = await window.preloadLoyaltyData();
            window.globalLoyaltyData = loyaltyData.loyalty || [];
        } catch(e) {
            window.globalLoyaltyData = [];
        }
        
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
        let totalBonuses = 0;
        
        const groupedBuy = {};
        const groupedSell = {};
        const groupedBonuses = {};
        const rankingBuy = {};
        const rankingSell = {};
        const rawFeed = [];
        const dailyData = {}; 
        const dynamicBuyStats = {};
        const hourlyData = new Array(24).fill(0);
        
        // Zliczanie premii z uwzględnieniem filtrów
        window.globalBonuses.forEach(b => {
            const bDate = parseDate(b.date);
            const bTS = bDate.getTime();
            
            if (filterStartTS && bTS < filterStartTS) return;
            if (filterEndTS && bTS > filterEndTS) return;

            const empName = b.employee || "Nieznany";
            if (empFilterValue !== "ALL" && empName !== empFilterValue) return;

            const amt = parseFloat(b.amount) || 0;
            totalBonuses += amt;

            if (!groupedBonuses[empName]) groupedBonuses[empName] = 0;
            groupedBonuses[empName] += amt;
        });

        data.forEach(row => {
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
        
        window.currentFilteredFeed = rawFeed;

        // Odjęcie wypłaconych premii od zysku netto
        totalProfit -= totalBonuses;

        animateCountUp(document.getElementById('total-buy'), totalBuy);
        animateCountUp(document.getElementById('total-sell'), totalSell);
        if (totalBonusesEl) animateCountUp(totalBonusesEl, totalBonuses);
        
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
                <tr onclick="window.openProductStats('${item.name.replace(/'/g, "\\'")}')" style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" title="Kliknij, aby otworzyć statystyki produktu">
                    <td style="color: var(--accent-color); font-weight: 800;"><i class="fas fa-box" style="margin-right: 8px; opacity: 0.7;"></i> ${item.name}</td>
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
                    <td onclick="window.openEmployeeProfile('${item.name}')" title="Kliknij, aby zobaczyć profil"><strong class="clickable-emp"><i class="fas fa-user-circle"></i> ${item.name}</strong></td>
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
                    <td onclick="window.openEmployeeProfile('${item.name}')" title="Kliknij, aby zobaczyć profil"><strong class="clickable-emp"><i class="fas fa-user-circle"></i> ${item.name}</strong></td>
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
                        ssn: item.ssn || "", 
                        totalAmount: 0,
                        items: [],
                        sortIndex: index 
                    };
                }
                if (item.ssn) groupedTransactions[key].ssn = item.ssn;
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
        renderCharts(groupedSell, dailyData, hourlyData, groupedBonuses);
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
        const empNameSafe = tx.employee || "Nieznany";
        
        let displayDate = tx.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) {
            const d = new Date(displayDate);
            displayDate = d.toLocaleString('pl-PL'); 
        }
        
        return `
            <div class="feed-item" onclick="this.classList.toggle('active-feed')">
                <div class="feed-item-summary">
                    <span class="feed-id-badge">#${tx.id}</span>
                    <span class="feed-emp clickable-emp" title="Pokaż profil" onclick="event.stopPropagation(); window.openEmployeeProfile('${empNameSafe}')"><i class="fas fa-user-circle"></i> ${empNameSafe}</span>
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
    
    // DODANIE LOGU
    window.addSystemLog('CEL FINANSOWY', `Zmieniono tygodniowy cel finansowy na: ${window.formatMoney(goal)}$`);

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

function renderCharts(groupedSell, dailyData, hourlyData, groupedBonuses) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    if (topItemsChartInstance) topItemsChartInstance.destroy();
    if (cashflowChartInstance) cashflowChartInstance.destroy();
    if (peakHoursChartInstance) peakHoursChartInstance.destroy();
    if (bonusesChartInstance) bonusesChartInstance.destroy();

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

    // =====================================
    // NOWY WYKRES PREMII (DOUGHNUT)
    // =====================================
    const bonusLabels = Object.keys(groupedBonuses || {});
    const bonusData = Object.values(groupedBonuses || {});
    const hasBonuses = bonusData.some(v => v > 0);

    const finalBonusLabels = hasBonuses ? bonusLabels : ["Brak premii w tym okresie"];
    const finalBonusData = hasBonuses ? bonusData : [1];
    
    const doughnutColorsArr = bonusLabels.map((_, i) => {
        const colors = ['#f59e0b', '#38bdf8', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
        return colors[i % colors.length];
    });
    const finalBonusColors = hasBonuses ? doughnutColorsArr : ['rgba(255, 255, 255, 0.05)'];

    const ctxBonus = document.getElementById('bonusesChart');
    if(ctxBonus) {
        bonusesChartInstance = new Chart(ctxBonus.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: finalBonusLabels,
                datasets: [{
                    data: finalBonusData,
                    backgroundColor: finalBonusColors,
                    borderWidth: 0,
                    hoverOffset: hasBonuses ? 8 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif" } } 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if(!hasBonuses) return " Brak wypłaconych premii";
                                return ' ' + context.label + ': ' + window.formatMoney(context.raw) + '$';
                            }
                        }
                    }
                },
                cutout: '75%'
            }
        });
    }
}

// ==========================================
// STATYSTYKI ZAAWANSOWANE PRODUKTU (MODAL)
// ==========================================
window.openProductStats = function(itemName) {
    if (!window.currentFilteredFeed) return;

    // Bierzemy WSZYSTKIE transakcje dla danego produktu (niezależnie czy skup czy sprzedaż)
    const txs = window.currentFilteredFeed.filter(tx => tx.name === itemName);
    if(txs.length === 0) return showNotice("Brak danych dla tego przedmiotu w obecnym widoku.", "warning");

    let buyQty = 0, buyVal = 0, buyMax = 0, buyMin = Infinity;
    let sellQty = 0, sellVal = 0, sellMax = 0, sellMin = Infinity;

    // Dane do wykresu z podziałem na dni/czas
    let chartDataMap = {}; 

    const sortedTxs = [...txs].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    sortedTxs.forEach(tx => {
        const qty = tx.qty || 1;
        const val = tx.total || 0;
        const unitPrice = qty > 0 ? val / qty : 0;
        const isBuy = tx.type === 'skup';

        if (isBuy) {
            buyQty += qty;
            buyVal += val;
            if(unitPrice > buyMax) buyMax = unitPrice;
            if(unitPrice < buyMin) buyMin = unitPrice;
        } else {
            sellQty += qty;
            sellVal += val;
            if(unitPrice > sellMax) sellMax = unitPrice;
            if(unitPrice < sellMin) sellMin = unitPrice;
        }

        let displayDate = tx.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) {
            const d = new Date(displayDate);
            displayDate = d.toLocaleDateString('pl-PL') + ' ' + d.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
        } else if (typeof displayDate === 'string') {
            const parts = displayDate.split(' ');
            if (parts.length > 1) {
                displayDate = parts[0] + ' ' + parts[1].substring(0, 5);
            }
        }

        if(!chartDataMap[displayDate]) {
            chartDataMap[displayDate] = { volume: 0, buyCount: 0, sellCount: 0, buySum: 0, sellSum: 0 };
        }
        
        chartDataMap[displayDate].volume += qty;
        
        if(isBuy) {
            chartDataMap[displayDate].buySum += val;
            chartDataMap[displayDate].buyCount += qty;
        } else {
            chartDataMap[displayDate].sellSum += val;
            chartDataMap[displayDate].sellCount += qty;
        }
    });

    if(buyMin === Infinity) buyMin = 0;
    if(sellMin === Infinity) sellMin = 0;

    const buyAvg = buyQty > 0 ? buyVal / buyQty : 0;
    const sellAvg = sellQty > 0 ? sellVal / sellQty : 0;
    
    // Obliczanie zysku na czysto - na bazie średniej ceny kupna względem sprzedanych sztuk
    const estimatedProfit = (sellQty * sellAvg) - (sellQty * buyAvg);

    // Podstawianie danych do UI
    document.getElementById('ps-item-name').innerText = itemName;
    document.getElementById('ps-total-profit').innerText = window.formatMoney(estimatedProfit) + '$';

    document.getElementById('ps-buy-qty').innerText = buyQty + ' szt.';
    document.getElementById('ps-buy-val').innerText = window.formatMoney(buyVal) + '$';
    document.getElementById('ps-buy-avg').innerText = window.formatMoney(buyAvg) + '$';
    document.getElementById('ps-buy-minmax').innerText = window.formatMoney(buyMin) + '$ / ' + window.formatMoney(buyMax) + '$';

    document.getElementById('ps-sell-qty').innerText = sellQty + ' szt.';
    document.getElementById('ps-sell-val').innerText = window.formatMoney(sellVal) + '$';
    document.getElementById('ps-sell-avg').innerText = window.formatMoney(sellAvg) + '$';
    document.getElementById('ps-sell-minmax').innerText = window.formatMoney(sellMin) + '$ / ' + window.formatMoney(sellMax) + '$';

    document.getElementById('product-stats-modal').classList.remove('hidden');

    // Przygotowanie tablic do rysowania wykresu
    let labels = [];
    let buyPrices = [];
    let sellPrices = [];
    let volumes = [];

    for (const [dateStr, data] of Object.entries(chartDataMap)) {
        labels.push(dateStr);
        volumes.push(data.volume);
        
        let curBuy = data.buyCount > 0 ? data.buySum / data.buyCount : null;
        let curSell = data.sellCount > 0 ? data.sellSum / data.sellCount : null;

        buyPrices.push(curBuy);
        sellPrices.push(curSell);
    }

    const ctx = document.getElementById('productDetailsChart');
    if (ctx) {
        if (productDetailsChartInstance) {
            productDetailsChartInstance.destroy();
        }

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
        Chart.defaults.font.family = "'Inter', sans-serif";

        productDetailsChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Średnia cena SKUPU ($)',
                        data: buyPrices,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        spanGaps: true, // Łączy punkty nawet, jeśli w danym dniu nie było operacji skupu
                        yAxisID: 'y'
                    },
                    {
                        label: 'Średnia cena SPRZEDAŻY ($)',
                        data: sellPrices,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        spanGaps: true, // Łączy punkty przeskakując przez luki (null)
                        yAxisID: 'y'
                    },
                    {
                        label: 'Wolumen (szt.)',
                        data: volumes,
                        type: 'bar',
                        backgroundColor: 'rgba(56, 189, 248, 0.2)',
                        borderColor: '#38bdf8',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y1'
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
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: '#94a3b8', font: { size: 10 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 2) {
                                        label += context.parsed.y + ' szt.';
                                    } else {
                                        label += window.formatMoney(context.parsed.y) + '$';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 7,
                            maxRotation: 0,
                            autoSkip: true,
                            font: { size: 9 }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: { display: true, text: 'Cena ($)', color: '#fff', font: {size: 10} },
                        ticks: { font: { size: 9 } }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Wolumen (szt.)', color: '#38bdf8', font: {size: 10} },
                        ticks: { font: { size: 9 }, stepSize: 1 }
                    }
                }
            }
        });
    }
}

window.closeProductStats = function() {
    document.getElementById('product-stats-modal').classList.add('hidden');
}

// ==========================================
// ZARZĄDZANIE PRACOWNIKAMI I PROFILE
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
        const data = await window.preloadEmployeesData();
        
        if (data.employees && data.employees.length > 0) {
            window.currentEmployeesList = data.employees; 

            tbody.innerHTML = data.employees.map(emp => {
                const isBoss = emp.role && emp.role.toLowerCase() === 'szef';
                const rankDisplay = emp.rank ? emp.rank : "Pracownik";
                return `
                    <tr>
                        <td onclick="window.openEmployeeProfile('${emp.name}')" title="Kliknij, aby zobaczyć profil"><strong class="clickable-emp"><i class="fas fa-user-circle"></i> ${emp.name}</strong></td>
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
// PROFIL PRACOWNIKA (WIZYTÓWKA) - ZAAWANSOWANA ANALIZA
// ------------------------------------------
window.openEmployeeProfile = function(name) {
    if(!name || name === "Nieznany") return;
    
    // Zabezpieczenie: jeśli modal nie istnieje na stronie w momencie kliknięcia, dodaj go
    if (!document.getElementById('employee-profile-modal')) {
        const profileModalHTML = `
            <div id="employee-profile-modal" class="emp-modal-overlay hidden">
                <div class="emp-modal-content" style="max-width: 550px;">
                    <div class="emp-modal-header">
                        <h2><i class="fas fa-id-badge"></i> Akta pracownika</h2>
                        <button class="emp-close-btn" onclick="window.closeEmployeeProfile()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="emp-modal-body" id="emp-profile-body">
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', profileModalHTML);
    }

    let tBuy = 0;
    let tSell = 0;
    let ops = 0;
    let maxDeal = 0;
    let itemCounts = {};
    let activeDays = new Set();
    let firstFound = false;
    let lastActive = "Brak aktywności";
    
    const feed = window.globalSortedTransactions || [];
    
    feed.forEach(tx => {
        if (tx.employee === name) {
            ops++;
            activeDays.add(parseDate(tx.date).toLocaleDateString());
            
            // Ostatnia aktywność
            if (!firstFound) {
                let dDate = tx.date;
                if (typeof dDate === 'string' && dDate.includes('T')) {
                    dDate = new Date(dDate).toLocaleString('pl-PL');
                }
                lastActive = dDate;
                firstFound = true;
            }

            if (tx.type === 'skup') tBuy += tx.totalAmount;
            if (tx.type === 'sprzedaz') tSell += tx.totalAmount;
            
            if (tx.totalAmount > maxDeal) maxDeal = tx.totalAmount;
            
            tx.items.forEach(i => {
                itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
            });
        }
    });

    const favItem = Object.entries(itemCounts)
        .sort((a,b) => b[1] - a[1])[0] || ["Brak", 0];

    const empData = window.currentEmployeesList.find(e => e.name === name) || {};
    const rank = empData.rank || "Pracownik";
    const ssn = empData.ssn || "Brak danych";
    const pluses = empData.pluses || 0;
    const minuses = empData.minuses || 0;
    
    const totalVolume = tBuy + tSell;
    const avgOpsPerDay = activeDays.size > 0 ? (ops / activeDays.size).toFixed(1) : 0;

    const body = document.getElementById('emp-profile-body');
    if (body) {
        body.innerHTML = `
            <div class="profile-header-info">
                <div class="profile-avatar">${name.charAt(0).toUpperCase()}</div>
                <div class="profile-details">
                    <h3>${name}</h3>
                    <div style="display:flex; gap:10px; font-size:0.85rem; flex-wrap:wrap;">
                        <span class="emp-rank-badge">${rank}</span>
                        <span class="qty-badge" style="color:var(--text-secondary); border:1px dashed rgba(255,255,255,0.2);">SSN: ${ssn}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="p-stat-box">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Suma Obrtu</div>
                    <div class="p-stat-val" style="color:var(--accent-color)">${window.formatMoney(totalVolume)}$</div>
                </div>
                <div class="p-stat-box">
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Operacji łącznie</div>
                    <div class="p-stat-val" style="color:white">${ops}</div>
                </div>
            </div>

            <div class="profile-insights">
                <div class="insight-row">
                    <span class="insight-label">Efektywność (śr. operacji/dzień)</span>
                    <span class="insight-value" style="color:var(--success);">${avgOpsPerDay}</span>
                </div>
                <div class="insight-row">
                    <span class="insight-label">Ostatnio widziany</span>
                    <span class="insight-value" style="color:var(--accent-color);">${lastActive}</span>
                </div>
                <div class="insight-row">
                    <span class="insight-label">Specjalizacja</span>
                    <span class="insight-value" style="color:var(--warning);">${favItem[0]} (${favItem[1]} szt.)</span>
                </div>
                <div class="insight-row">
                    <span class="insight-label">Rekordowy pojedynczy deal</span>
                    <span class="insight-value"><i class="fas fa-dollar-sign"></i> ${window.formatMoney(maxDeal)}</span>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">
                        <span>Wkład w aktywność firmy</span>
                        <span>${ops > 10 ? 'Aktywny' : 'Początkujący'}</span>
                    </div>
                    <div class="trust-bar-container">
                        <div class="trust-bar-fill" style="width: ${Math.min(ops * 2, 100)}%;"></div>
                    </div>
                </div>
            </div>

            <div class="reputation-box">
                <div class="rep-item">
                    <span class="rep-title">Pochwały</span>
                    <span class="rep-score plus" id="prof-plus-val">${pluses}</span>
                </div>
                <div class="rep-actions">
                    <button class="rep-btn add" onclick="window.updateReputation('${name}', 'plus')" title="Dodaj plusa"><i class="fas fa-plus"></i></button>
                    <button class="rep-btn sub" onclick="window.updateReputation('${name}', 'minus')" title="Dodaj minusa"><i class="fas fa-minus"></i></button>
                </div>
                <div class="rep-item">
                    <span class="rep-title">Kary</span>
                    <span class="rep-score minus" id="prof-minus-val">${minuses}</span>
                </div>
            </div>
        `;
    }
    
    const modal = document.getElementById('employee-profile-modal');
    if (modal) modal.classList.remove('hidden');
}

window.closeEmployeeProfile = function() {
    const modal = document.getElementById('employee-profile-modal');
    if (modal) modal.classList.add('hidden');
}

window.updateReputation = async function(name, type) {
    const pVal = document.getElementById('prof-plus-val');
    const mVal = document.getElementById('prof-minus-val');
    
    // Wizualna aktualizacja natychmiastowa (dla wygody i odczucia prędkości)
    if(type === 'plus') pVal.innerText = parseInt(pVal.innerText) + 1;
    else mVal.innerText = parseInt(mVal.innerText) + 1;

    try {
        const res = await fetch(PIN_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update_reputation', name: name, type: type })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotice(type === 'plus' ? "Dodano pochwałę do bazy głównej!" : "Zapisano karę w bazie głównej!", type === 'plus' ? "success" : "danger");
            
            // DODANIE LOGU
            window.addSystemLog('REPUTACJA', `Dodano ${type === 'plus' ? 'pochwałę (+)' : 'karę (-)'} dla pracownika: ${name}`);

            // Aktualizacja pamięci podręcznej przeglądarki
            const emp = window.currentEmployeesList.find(e => e.name === name);
            if(emp) {
                emp.pluses = data.pluses;
                emp.minuses = data.minuses;
            }
            
            // Poprawka wizualna na 100% z bazy (gdyby ktoś np. kliknął 2 razy szybko)
            pVal.innerText = data.pluses;
            mVal.innerText = data.minuses;
        } else {
            // Cofnięcie zmian w przypadku błędu
            if(type === 'plus') pVal.innerText = parseInt(pVal.innerText) - 1;
            else mVal.innerText = parseInt(mVal.innerText) - 1;
            showNotice("Błąd zapisu w bazie danych!", "danger");
        }
    } catch (e) {
        // Cofnięcie zmian w przypadku błędu połączenia
        if(type === 'plus') pVal.innerText = parseInt(pVal.innerText) - 1;
        else mVal.innerText = parseInt(mVal.innerText) - 1;
        showNotice("Błąd połączenia z serwerem!", "danger");
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
    const name = document.getElementById('edit-emp-name').value;

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
            
            // DODANIE LOGU
            window.addSystemLog('EDYCJA PRACOWNIKA', `Zaktualizowano dane pracownika: ${name} (Stopień: ${rank}, SSN: ${ssn || 'Brak'})`);

            window.employeesFetchPromise = null;
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
        
        // DODANIE LOGU
        window.addSystemLog('NOWY PRACOWNIK', `Zatrudniono nową osobę: ${name} (Stopień: ${rank}, Uprawnienia Szefa: ${isBoss ? 'TAK' : 'NIE'})`);

        window.employeesFetchPromise = null;
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
        
        // DODANIE LOGU
        window.addSystemLog('USUNIĘTO PRACOWNIKA', `Zwolniono pracownika z firmy: ${name}`);

        window.employeesFetchPromise = null;
        await loadEmployeesToTable();
        showNotice("Pracownik usunięty!", "warning");
    } catch (e) { showNotice("Błąd usuwania!", "danger"); }
}

window.toggleEmployeeRole = async function(pin, newRole) {
    try {
        showNotice("Zmienianie uprawnień...", "info");
        await fetch(PIN_API_URL, { method: 'POST', body: JSON.stringify({ action: 'toggle_role', pin: pin, role: newRole }) });
        
        // Znajdź pracownika dla logu
        const emp = window.currentEmployeesList.find(e => e.pin === pin);
        const empName = emp ? emp.name : "Nieznany PIN";

        // DODANIE LOGU
        window.addSystemLog('ZMIANA UPRAWNIEŃ', `Zmieniono dostęp do panelu dla: ${empName} na: ${newRole === 'szef' ? 'Pełny dostęp' : 'Brak dostępu'}`);

        window.employeesFetchPromise = null;
        await loadEmployeesToTable();
        showNotice("Zmieniono uprawnienia!", "success");
    } catch (e) { showNotice("Błąd zmiany uprawnień!", "danger"); }
}

// ==========================================
// ZARZĄDZANIE KLIENTAMI (KARTY LOJALNOŚCIOWE)
// ==========================================
window.openClientsManager = async function() {
    document.getElementById('clients-manager-modal').classList.remove('hidden');
    
    // Używamy pre-ładowanej bazy klientów w panelu szefa
    const data = await window.preloadLoyaltyData();
    window.globalLoyaltyData = data.loyalty || [];
    window.renderClientsTable();
}

window.closeClientsManager = function() {
    document.getElementById('clients-manager-modal').classList.add('hidden');
    const searchInput = document.getElementById('client-search-input');
    if (searchInput) searchInput.value = "";
}

window.renderClientsTable = function() {
    const tbody = document.getElementById('clients-table-body');
    const searchInput = document.getElementById('client-search-input');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (!window.globalLoyaltyData || window.globalLoyaltyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak zarejestrowanych klientów w bazie.</td></tr>';
        return;
    }

    let clientsArray = [...window.globalLoyaltyData];

    if (term) {
        clientsArray = clientsArray.filter(c => String(c.ssn).toLowerCase().includes(term));
    }

    clientsArray.sort((a, b) => b.stamps - a.stamps);

    if (clientsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: 20px;">Brak klientów pasujących do wyszukiwania.</td></tr>';
        return;
    }

    tbody.innerHTML = clientsArray.map(c => `
        <tr>
            <td><strong style="color: var(--accent-color); font-family: monospace; font-size: 1.1rem;">${c.ssn}</strong></td>
            <td style="text-align: center;"><span class="rank-badge"><i class="fas fa-stamp"></i> ${c.stamps}</span></td>
            <td style="text-align: right; font-weight: 800; color: var(--success);">${window.formatMoney(c.totalSpent)}$</td>
            <td style="text-align: right;">
                <button onclick="openResetStampsModal('${c.ssn}', ${c.stamps})" class="emp-action-btn emp-btn-del" title="Wyzeruj pieczątki klienta">
                    <i class="fas fa-trash-restore"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.filterClients = function() {
    window.renderClientsTable();
}

window.openResetStampsModal = function(ssn, currentStamps) {
    if(currentStamps <= 0) return showNotice("Ten klient ma już 0 pieczątek!", "info");
    document.getElementById('reset-stamps-ssn').innerText = ssn;
    document.getElementById('reset-stamps-target-ssn').value = ssn;
    document.getElementById('reset-stamps-pin').value = '';
    document.getElementById('reset-stamps-modal').classList.remove('hidden');
}

window.closeResetStampsModal = function() {
    document.getElementById('reset-stamps-modal').classList.add('hidden');
}

window.confirmResetStamps = async function() {
    const ssn = document.getElementById('reset-stamps-target-ssn').value;
    const pin = document.getElementById('reset-stamps-pin').value;
    const btn = document.getElementById('confirm-reset-stamps-btn');

    if(!pin) return showNotice("Wprowadź swój PIN szefa!", "warning");

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const pinRes = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const pinData = await pinRes.json();

        if(pinData.isValid && pinData.role && pinData.role.toLowerCase() === 'szef') {
            // DODANE ZABEZPIECZENIE: Sprawdzenie, czy PIN należy do zalogowanego szefa
            if(pinData.name !== currentEmployeeName) {
                showNotice("Odmowa! Wprowadź SWÓJ kod PIN.", "danger");
                document.getElementById('reset-stamps-pin').value = '';
                return;
            }

            const customer = window.globalLoyaltyData.find(c => String(c.ssn) === String(ssn));
            if(customer) {
                const res = await fetch(REPORTS_API_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: 'deduct_loyalty_stamps',
                        ssn: ssn,
                        cost: customer.stamps 
                    })
                });

                if(res.ok) {
                    showNotice(`Wyzerowano punkty klienta ${ssn}!`, "success");
                    
                    // DODANIE LOGU
                    window.addSystemLog('PIECZĄTKI', `Wyzerowano pieczątki dla klienta SSN: ${ssn} (Ilość skasowana: ${customer.stamps})`);

                    closeResetStampsModal();
                    
                    window.loyaltyFetchPromise = null;
                    const loyaltyData = await window.preloadLoyaltyData();
                    window.globalLoyaltyData = loyaltyData.loyalty || [];
                    window.renderClientsTable();
                } else {
                    showNotice("Wystąpił błąd w bazie danych!", "danger");
                }
            }
        } else {
            showNotice("Błędny PIN lub brak uprawnień!", "danger");
            document.getElementById('reset-stamps-pin').value = '';
        }
    } catch(e) {
        showNotice("Błąd połączenia z serwerem!", "danger");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

// ==========================================
// ZARZĄDZANIE USTAWIENIAMI LOJALNOŚCIOWYMI
// ==========================================
window.openLoyaltySettings = async function() {
    document.getElementById('loyalty-settings-modal').classList.remove('hidden');
    await loadLoyaltySettings();
}

window.closeLoyaltySettings = function() {
    document.getElementById('loyalty-settings-modal').classList.add('hidden');
}

async function loadLoyaltySettings() {
    const tbody = document.getElementById('loyalty-rewards-table-body');
    const rateInput = document.getElementById('loyalty-rate-input');
    
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Ładowanie danych...</td></tr>';
    
    try {
        const data = await window.preloadLoyaltySettingsData();
        
        if(data.rate) {
            rateInput.value = data.rate;
        }
        
        if (data.rewards && data.rewards.length > 0) {
            tbody.innerHTML = data.rewards.map((r, idx) => `
                <tr>
                    <td><strong style="color: white;">${r.name}</strong></td>
                    <td style="text-align: center;"><span class="rank-badge"><i class="fas fa-stamp"></i> ${r.cost}</span></td>
                    <td style="text-align: right;">
                        <button onclick="deleteLoyaltyReward('${r.name}')" class="emp-action-btn emp-btn-del" title="Usuń nagrodę">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-secondary);">Brak zdefiniowanych nagród.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--danger);">Błąd pobierania ustawień z bazy!</td></tr>';
    }
}

window.saveLoyaltyRate = async function() {
    const rateInput = document.getElementById('loyalty-rate-input');
    const rate = parseInt(rateInput.value);
    const btn = document.getElementById('save-rate-btn');
    
    if(isNaN(rate) || rate <= 0) return showNotice("Podaj prawidłowy przelicznik!", "warning");
    
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const res = await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'save_loyalty_rate', rate: rate })
        });
        if(res.ok) {
            showNotice("Przelicznik zapisany pomyślnie!", "success");
            
            // DODANIE LOGU
            window.addSystemLog('USTAWIENIA LOJALNOŚCIOWE', `Zmieniono przelicznik punktów. Obecnie: ${rate}$ = 1 pieczątka`);

            window.loyaltySettingsFetchPromise = null;
        } else {
            throw new Error();
        }
    } catch(e) {
        showNotice("Błąd zapisu przelicznika!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

window.addLoyaltyReward = async function() {
    const nameInput = document.getElementById('new-reward-name');
    const costInput = document.getElementById('new-reward-cost');
    const btn = document.getElementById('add-reward-btn');
    
    const name = nameInput.value.trim();
    const cost = parseInt(costInput.value);
    
    if(!name) return showNotice("Podaj nazwę nagrody!", "warning");
    if(isNaN(cost) || cost <= 0) return showNotice("Podaj prawidłowy koszt (punkty)!", "warning");
    
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const res = await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_loyalty_reward', name: name, cost: cost })
        });
        
        if(res.ok) {
            showNotice("Nagroda dodana!", "success");
            
            // DODANIE LOGU
            window.addSystemLog('NOWA NAGRODA', `Dodano nową nagrodę do systemu: ${name} (Koszt: ${cost} pieczątek)`);

            nameInput.value = "";
            costInput.value = "";
            window.loyaltySettingsFetchPromise = null;
            await loadLoyaltySettings();
        } else {
            throw new Error();
        }
    } catch(e) {
        showNotice("Błąd dodawania nagrody!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

window.deleteLoyaltyReward = async function(name) {
    if(!confirm(`Na pewno usunąć nagrodę: ${name}?`)) return;
    try {
        showNotice("Usuwanie nagrody...", "info");
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_loyalty_reward', name: name })
        });
        showNotice("Usunięto nagrodę!", "warning");
        
        // DODANIE LOGU
        window.addSystemLog('USUNIĘTO NAGRODĘ', `Usunięto nagrodę z systemu lojalnościowego: ${name}`);

        window.loyaltySettingsFetchPromise = null;
        await loadLoyaltySettings();
    } catch(e) {
        showNotice("Błąd usuwania nagrody!", "danger");
    }
}

// ==========================================
// ZARZĄDZANIE PREMIAMI
// ==========================================
window.openBonusesManager = async function() {
    document.getElementById('bonuses-manager-modal').classList.remove('hidden');
    const select = document.getElementById('new-bonus-emp');
    select.innerHTML = '<option value="">Wybierz pracownika...</option>';
    
    if (window.currentEmployeesList) {
        window.currentEmployeesList.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.name;
            opt.innerText = emp.name;
            select.appendChild(opt);
        });
    }
    
    await loadBonusesToTable();
}

window.closeBonusesManager = function() {
    document.getElementById('bonuses-manager-modal').classList.add('hidden');
}

async function loadBonusesToTable() {
    const tbody = document.getElementById('bonuses-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Ładowanie danych...</td></tr>';
    
    try {
        const data = await window.preloadBonusesData();
        window.globalBonuses = data.bonuses || [];

        if (window.globalBonuses.length > 0) {
            const sortedBonuses = window.globalBonuses.sort((a,b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
            tbody.innerHTML = sortedBonuses.map(b => {
                let displayDate = b.date;
                if (typeof displayDate === 'string' && displayDate.includes('T')) {
                    displayDate = new Date(displayDate).toLocaleString('pl-PL');
                }
                return `
                    <tr>
                        <td>${displayDate}</td>
                        <td><strong class="clickable-emp" onclick="window.openEmployeeProfile('${b.employee}')"><i class="fas fa-user-circle"></i> ${b.employee}</strong></td>
                        <td><span style="color: var(--text-secondary);">${b.reason || '-'}</span></td>
                        <td style="text-align: right; color: var(--warning); font-weight: 800;">${window.formatMoney(b.amount)}$</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak wpisów o premiach.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Błąd połączenia z bazą!</td></tr>';
    }
}

window.addBonus = async function() {
    const btn = document.getElementById('add-bonus-btn');
    const empInput = document.getElementById('new-bonus-emp');
    const amountInput = document.getElementById('new-bonus-amount');
    const reasonInput = document.getElementById('new-bonus-reason');

    const employee = empInput.value;
    const amount = parseFloat(amountInput.value);
    const reason = reasonInput.value.trim();

    if (!employee) return showNotice("Wybierz pracownika!", "danger");
    if (isNaN(amount) || amount <= 0) return showNotice("Wprowadź poprawną kwotę!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const res = await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_bonus',
                employee: employee,
                amount: amount,
                reason: reason,
                boss: document.getElementById('logged-boss-name').innerText 
            })
        });

        showNotice("Przetwarzanie...", "info");
        
        // DODANIE LOGU
        window.addSystemLog('PREMIA', `Wypłacono premię dla pracownika: ${employee} w kwocie: ${window.formatMoney(amount)}$ (Tytuł: ${reason || 'Brak tytułu'})`);

        window.bonusesFetchPromise = null;
        await loadBonusesToTable();
        window.reportsFetchPromise = null;
        await loadRealData(); 
        showNotice(`Wypłacono premię dla: ${employee}`, "success");

        amountInput.value = '';
        reasonInput.value = '';
        empInput.value = '';
    } catch (e) {
        showNotice("Nie udało się zapisać premii!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Wypłać';
    }
}

// ==========================================
// NOWE: DZIENNIK LOGÓW SYSTEMOWYCH
// ==========================================
window.currentLogCategoryFilter = "ALL";

window.setLogCategoryFilter = function(category) {
    window.currentLogCategoryFilter = category;
    window.renderSystemLogs();
};

window.openSystemLogs = async function() {
    document.getElementById('system-logs-modal').classList.remove('hidden');
    await window.loadLogsToTable();
};

window.closeSystemLogs = function() {
    document.getElementById('system-logs-modal').classList.add('hidden');
    const searchInput = document.getElementById('logs-search-input');
    if (searchInput) searchInput.value = "";
    window.currentLogCategoryFilter = "ALL"; // Reset filtra przy zamykaniu okna
};

window.loadLogsToTable = async function() {
    const tbody = document.getElementById('system-logs-table-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Ładowanie logów...</td></tr>';
    
    try {
        const data = await window.preloadLogsData();
        window.globalSystemLogs = data.logs || [];
        window.renderSystemLogs();
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Błąd połączenia z bazą logów!</td></tr>';
    }
};

window.renderSystemLogs = function() {
    const tbody = document.getElementById('system-logs-table-body');
    const searchInput = document.getElementById('logs-search-input');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (!window.globalSystemLogs || window.globalSystemLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak logów w systemie.</td></tr>';
        return;
    }

    let logsArray = [...window.globalSystemLogs];
    
    // Obliczanie statystyk
    let totalLogs = logsArray.length;
    let securityAlerts = 0;
    let loginActions = 0;
    let managementChanges = 0;

    logsArray.forEach(l => {
        const type = String(l.type).toUpperCase();
        if (type.includes("USUNIĘTO") || type.includes("KARA") || type.includes("BŁĄD") || type.includes("BŁĘDNY")) securityAlerts++;
        if (type.includes("LOGOWANIE") || type.includes("WYLOGOWANIE") || type.includes("ZALOGOWANO")) loginActions++;
        if (type.includes("EDYCJA") || type.includes("ZMIANA") || type.includes("UPRAWNIENIA") || type.includes("USTAWIENIA") || type.includes("REPUTACJA") || type.includes("PREMIA")) managementChanges++;
    });

    const statsContainer = document.getElementById('system-logs-stats-summary');
    if (statsContainer) {
        const getBoxStyle = (cat) => {
            const isActive = window.currentLogCategoryFilter === cat;
            return `background: ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isActive ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)'}; padding: 15px; border-radius: 10px; text-align: center; flex: 1; min-width: 120px; cursor: pointer; transition: 0.2s;`;
        };

        statsContainer.innerHTML = `
            <div class="log-stat-box" onclick="setLogCategoryFilter('ALL')" style="${getBoxStyle('ALL')}">
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Suma zdarzeń</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: var(--accent-color); margin-top: 5px;">${totalLogs}</div>
            </div>
            <div class="log-stat-box" onclick="setLogCategoryFilter('LOGIN')" style="${getBoxStyle('LOGIN')}">
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Sesje / Autoryzacje</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: var(--success); margin-top: 5px;">${loginActions}</div>
            </div>
            <div class="log-stat-box" onclick="setLogCategoryFilter('MANAGEMENT')" style="${getBoxStyle('MANAGEMENT')}">
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Modyfikacje baz</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: var(--warning); margin-top: 5px;">${managementChanges}</div>
            </div>
            <div class="log-stat-box" onclick="setLogCategoryFilter('SECURITY')" style="${getBoxStyle('SECURITY')}">
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Alerty bezpieczeństwa</div>
                <div style="font-size: 1.5rem; font-weight: 900; color: var(--danger); margin-top: 5px;">${securityAlerts}</div>
            </div>
        `;
    }
    
    logsArray.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    // Filtrowanie po wpisanym tekście
    if (term) {
        logsArray = logsArray.filter(l => 
            String(l.employee).toLowerCase().includes(term) ||
            String(l.type).toLowerCase().includes(term) ||
            String(l.description).toLowerCase().includes(term)
        );
    }

    // Filtrowanie po klikniętym kafelku
    if (window.currentLogCategoryFilter !== "ALL") {
        logsArray = logsArray.filter(l => {
            const type = String(l.type).toUpperCase();
            if (window.currentLogCategoryFilter === "SECURITY") {
                return type.includes("USUNIĘTO") || type.includes("KARA") || type.includes("BŁĄD") || type.includes("BŁĘDNY");
            }
            if (window.currentLogCategoryFilter === "LOGIN") {
                return type.includes("LOGOWANIE") || type.includes("WYLOGOWANIE") || type.includes("ZALOGOWANO");
            }
            if (window.currentLogCategoryFilter === "MANAGEMENT") {
                return type.includes("EDYCJA") || type.includes("ZMIANA") || type.includes("UPRAWNIENIA") || type.includes("USTAWIENIA") || type.includes("REPUTACJA") || type.includes("PREMIA");
            }
            return true;
        });
    }

    if (logsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: 20px;">Brak wyników wyszukiwania.</td></tr>';
        return;
    }

    tbody.innerHTML = logsArray.map(l => {
        let displayDate = l.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) {
            displayDate = new Date(displayDate).toLocaleString('pl-PL');
        }
        
        let safeType = String(l.type || "").toUpperCase();
        let typeColor = "var(--text-secondary)";
        
        if(safeType.includes("USUNIĘTO") || safeType.includes("KARA") || safeType.includes("BŁĄD") || safeType.includes("BŁĘDNY") || safeType.includes("WYLOGOWANIE")) typeColor = "var(--danger)";
        else if(safeType.includes("NOWY") || safeType.includes("POCHWAŁA") || safeType.includes("ZALOGOWANO") || safeType.includes("LOGOWANIE")) typeColor = "var(--success)";
        else if(safeType.includes("EDYCJA") || safeType.includes("ZMIANA") || safeType.includes("UPRAWNIENIA") || safeType.includes("USTAWIENIA")) typeColor = "var(--warning)";
        else if(safeType.includes("PREMIA") || safeType.includes("KOREKTA")) typeColor = "var(--warning)";
        else typeColor = "var(--accent-color)";

        return `
            <tr>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${displayDate}</td>
                <td><strong style="color: white;"><i class="fas fa-user-shield"></i> ${l.employee}</strong></td>
                <td style="text-align: center;">
                    <span style="background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; color: ${typeColor}; border: 1px solid ${typeColor}40; text-transform: uppercase; white-space: nowrap; display: inline-block;">${safeType}</span>
                </td>
                <td style="color: var(--text-primary); font-size: 0.9rem; white-space: normal !important; text-align: left !important; line-height: 1.5; min-width: 300px;">
                    ${l.description}
                </td>
            </tr>
        `;
    }).join('');
};

window.filterSystemLogs = function() {
    window.renderSystemLogs();
};

// ==========================================
// RĘCZNE ODŚWIEŻANIE LOGÓW SYSTEMOWYCH W LOCIE
// ==========================================
window.refreshSystemLogs = async function() {
    const btn = document.getElementById('refresh-logs-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Zmuszamy system do zignorowania zapisanych danych i pobrania świeżych z Google Sheets
    window.logsFetchPromise = null;
    
    try {
        await window.loadLogsToTable();
        showNotice("Pomyślnie pobrano najnowsze logi z bazy!", "success");
    } catch (e) {
        showNotice("Błąd podczas pobierania logów!", "danger");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Odśwież';
        }
    }
};

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
    const totalBonusVal = document.getElementById('total-bonuses') ? document.getElementById('total-bonuses').innerText : "0$";
    
    document.getElementById('v-buy').innerText = totalBuyVal;
    document.getElementById('v-sell').innerText = totalSellVal;
    document.getElementById('v-bal').innerText = totalProfitVal;
    const vBonusEl = document.getElementById('v-bonus');
    if(vBonusEl) vBonusEl.innerText = totalBonusVal;
    
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
            useCORS: true,
            onclone: (clonedDoc) => {
                // Trik: Przed strzeleniem fotki modyfikujemy wygląd "w locie"
                const clonedArea = clonedDoc.getElementById('report-visual-card');
                if (clonedArea) {
                    // 1. Zmuszamy tło obrazka, by rozszerzyło się do wielkości wszystkich 4 kafelków
                    clonedArea.style.setProperty('width', 'max-content', 'important');
                    clonedArea.style.setProperty('padding', '40px', 'important');
                    
                    // 2. Formatujemy same kafelki z kwotami
                    const bigNumbers = clonedArea.querySelectorAll('#v-buy, #v-sell, #v-bal, #v-bonus');
                    bigNumbers.forEach(num => {
                        if (num) {
                            num.style.setProperty('font-size', '2.6rem', 'important'); // Delikatnie większe cyfry
                            num.style.setProperty('margin-top', '15px', 'important'); // Odstęp od nagłówka
                            
                            // Pobieramy "rodzica" (czyli sam kafelek) i wymuszamy układ pionowy
                            const parentCard = num.parentElement;
                            if (parentCard) {
                                parentCard.style.setProperty('display', 'flex', 'important');
                                parentCard.style.setProperty('flex-direction', 'column', 'important');
                                parentCard.style.setProperty('align-items', 'center', 'important');
                                parentCard.style.setProperty('justify-content', 'center', 'important');
                                parentCard.style.setProperty('text-align', 'center', 'important');
                                parentCard.style.setProperty('padding', '30px 40px', 'important'); // Dodatkowy oddech wewnątrz kafelka
                            }
                        }
                    });
                }
            }
        });
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "raport_elcartel.png");
            
            // PANCERNY UKŁAD 2-KOLUMNOWY DLA GŁÓWNEGO RAPORTU (BEZ SZARYCH TŁA NA LICZBACH)
            const embedFields = [
                {
                    name: "📊 Finanse operacyjne",
                    value: `**📉 Wydatki (skup):**\n**${totalBuyVal}**\n\n**📈 Przychody (sprzedaż):**\n**${totalSellVal}**\n\n**⚖️ Bilans brutto:**\n**${totalBalVal}**`,
                    inline: true
                },
                {
                    name: "💎 Podsumowanie netto",
                    value: `**🎁 Wypłacone premie:**\n**${totalBonusVal}**\n\n**💰 Zysk na czysto:**\n**${totalProfitVal}**`,
                    inline: true
                },
                {
                    name: "🏆 Top zaopatrzeniowcy",
                    value: topBuyStr,
                    inline: true
                },
                {
                    name: "🚚 Top sprzedający",
                    value: topSellStr,
                    inline: true
                }
            ];

            const payload = {
                username: currentEmployeeName ? `${currentEmployeeName}` : "Szef zarządu",
                embeds: [{
                    title: "🏛️ PROTOKÓŁ ANALITYCZNY ZARZĄDU EL CARTEL",
                    description: `Dokładne zestawienie operacji finansowych dla okresu:\n📅 **${dFrom || "Początek"} — ${dTo || "Dziś"}**\n👤 Analizowani: **${empSelectValue === "ALL" ? "Wszyscy pracownicy" : empSelectValue}**`,
                    color: 3447003, 
                    fields: embedFields,
                    image: { url: "attachment://raport_elcartel.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: `System EL CARTEL PAWN SHOP | ID: ${reportID}` }
                }]
            };

            // Wyciągnięcie zdjęcia szefa z kafelków profilu
            try {
                const profiles = JSON.parse(localStorage.getItem('elcartel_boss_profiles') || '[]');
                const currentProfile = profiles.find(p => p.name === currentEmployeeName);
                if (currentProfile && currentProfile.photo && currentProfile.photo.trim() !== "") {
                    payload.avatar_url = currentProfile.photo;
                }
            } catch (e) {}

            formData.append("payload_json", JSON.stringify(payload));
            const res = await fetch(BOSS_DISCORD_WEBHOOK, { method: "POST", body: formData });
            
            if (res.ok) { 
                // DODANIE LOGU
                window.addSystemLog('RAPORT DISCORD', `Wygenerowano i pomyślnie wysłano raport statystyczny na Discord.`);

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

    const attachPreload = (id, preloader) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('mouseenter', preloader);
    };

    document.querySelectorAll('.manage-emp-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const onclickCode = btn.getAttribute('onclick') || '';
            if (onclickCode.includes('openEmployeeManager')) window.preloadEmployeesData();
            if (onclickCode.includes('openBonusesManager')) window.preloadBonusesData();
            if (onclickCode.includes('openClientsManager')) window.preloadLoyaltyData();
            if (onclickCode.includes('openLoyaltySettings')) window.preloadLoyaltySettingsData();
            if (onclickCode.includes('openSystemLogs')) window.preloadLogsData(); 
        });
    });

    const scrollBtnHTML = `
        <button id="scrollToTopBtn" class="scroll-to-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" title="Wróć na górę">
            <i class="fas fa-arrow-up"></i>
        </button>
    `;
    document.body.insertAdjacentHTML('beforeend', scrollBtnHTML);

    // --- INICJALIZACJA ZAPISANYCH PROFILI ---
    if (typeof renderSavedProfiles === 'function') renderSavedProfiles();
});

window.toggleTable = function(id, header) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.toggle('collapsed-table');
        header.classList.toggle('collapsed');
    }
};

// ==========================================
// PAMIĘĆ PROFILU (ZAPISANE LOGOWANIE SZEFA)
// ==========================================
window.checkSavedBossProfile = function() {
    const savedPin = localStorage.getItem('cartel_boss_pin');
    const savedName = localStorage.getItem('cartel_boss_name');
    
    const normalForm = document.getElementById('login-normal-form');
    const savedProfile = document.getElementById('login-saved-profile');
    
    if (savedPin && savedName) {
        const pinInput = document.getElementById('boss-pin-input');
        // Uzupełnia pole automatycznie tylko wtedy, kiedy jest puste
        if(pinInput && !pinInput.value) pinInput.value = savedPin;
        
        const rememberCheckbox = document.getElementById('remember-boss-profile');
        if (rememberCheckbox) rememberCheckbox.checked = true;
        
        const nameDisplay = document.getElementById('saved-boss-name-display');
        if(nameDisplay) nameDisplay.innerText = savedName;
        
        const initialDisplay = document.getElementById('saved-boss-initial');
        if(initialDisplay) initialDisplay.innerText = savedName.charAt(0).toUpperCase();
        
        // Zostawiamy formularz widoczny, pokazujemy profil pod spodem
        if (normalForm) normalForm.classList.remove('hidden');
        if (savedProfile) {
            savedProfile.classList.remove('hidden');
            savedProfile.style.display = 'flex'; 
        }
    } else {
        if (normalForm) normalForm.classList.remove('hidden');
        if (savedProfile) {
            savedProfile.classList.add('hidden');
            savedProfile.style.display = 'none';
        }
    }
}

// ==========================================
// FUNKCJE SYSTEMU SZYBKIEGO LOGOWANIA
// ==========================================
window.renderSavedProfiles = function() {
    const container = document.getElementById('saved-profiles-container');
    if (!container) return;
    const profiles = JSON.parse(localStorage.getItem('elcartel_boss_profiles') || '[]');
    
    if (profiles.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    let html = '';

    profiles.forEach((p, index) => {
        const avatarHtml = p.photo && p.photo !== "" 
            ? `<img src="${p.photo}" class="saved-profile-avatar" alt="${p.name}">` 
            : `<div class="saved-profile-avatar" style="display:flex; justify-content:center; align-items:center; font-size:1.5rem; color:var(--text-secondary);"><i class="fas fa-user-tie"></i></div>`;
        
        html += `
            <div class="saved-profile-card" onclick="quickLogin('${p.pin}')">
                ${avatarHtml}
                <span class="saved-profile-name">${p.name}</span>
                <button class="remove-profile-btn" onclick="removeSavedProfile(${index}, event)" title="Usuń zapisany profil"><i class="fas fa-times"></i></button>
                
                <div class="profile-mini-stats">
                    <div class="stats-header">Zapisany profil</div>
                    <div class="stats-row">
                        <span><i class="fas fa-star text-secondary"></i> Stopień:</span>
                        <strong style="color: var(--accent-color); font-weight: 800;">${p.rank || 'Pracownik'}</strong>
                    </div>
                    <div class="stats-row">
                        <span><i class="fas fa-hashtag text-secondary"></i> SSN:</span>
                        <strong class="text-white-inline">${p.ssn || '---'}</strong>
                    </div>
                    <div class="stats-row">
                        <span><i class="fas fa-calendar-alt text-secondary"></i> Zatrudnienie:</span>
                        <strong class="text-white-inline" style="font-size: 0.75rem;">${p.dateZatrudnienia || 'Brak danych'}</strong>
                    </div>
                    <div class="stats-hint">Kliknij, aby zalogować</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.quickLogin = function(pin) {
    const pinInput = document.getElementById('boss-pin-input');
    if (pinInput) {
        pinInput.value = pin;
        if(typeof window.loginBoss === 'function') window.loginBoss(); 
    }
}

window.removeSavedProfile = function(index, event) {
    event.stopPropagation(); 
    let profiles = JSON.parse(localStorage.getItem('elcartel_boss_profiles') || '[]');
    profiles.splice(index, 1);
    localStorage.setItem('elcartel_boss_profiles', JSON.stringify(profiles));
    renderSavedProfiles();
    if (typeof showNotice === 'function') {
        showNotice("Usunięto zapisany profil.", "info");
    }
}

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