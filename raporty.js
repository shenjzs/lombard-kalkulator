// ==========================================
// WERSJA APLIKACJI (Zmień, aby wymusić odświeżenie u wszystkich)
// ==========================================
const APP_VERSION = "4.7.0"; // Normalizacja nazw produktów

// ==========================================
// KONFIGURACJA LINKÓW I CEN
// ==========================================
const ALLOWED_DISCORD_ROLES = ["1518034764974657566", "1522969080481579148"];
// Hierarchia stanowisk w firmie (od najwyższej do najniższej)
const RANK_HIERARCHY = [
    { id: "1499138968065806356", name: "Właściciel" },
    { id: "1499145834644635839", name: "Kierownik" },
    { id: "1499146687560552479", name: "Pracownik" }
];
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
        window.employeesFetchPromise = fetch(`${REPORTS_API_URL}?action=get_all_employees&t=${new Date().getTime()}`)
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
// SYSTEM LOGOWANIA DISCORD OAUTH2 (STATYSTYKI) + 12H PAMIĘCI
// ==========================================
window.loginBoss = function() {
    const btn = document.getElementById('login-btn');
    const originalBtnContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oczekiwanie na Discord...';

    const authUrl = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/auth/login";
    const width = 500;
    const height = 750;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const popup = window.open(authUrl, 'DiscordLogin', `width=${width},height=${height},top=${top},left=${left}`);

    const checkPopup = setInterval(() => {
        if (!popup || popup.closed || popup.closed === undefined) {
            clearInterval(checkPopup);
            if (btn.disabled) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                showNotice("Anulowano logowanie przez Discord.", "warning");
            }
        }
    }, 1000);

    const messageListener = async function(event) {
        if (event.origin !== "https://elcartel-wbhk.bcjds9j7ht.workers.dev") return;

        if (event.data && event.data.type === "DISCORD_LOGIN_SUCCESS") {
            window.removeEventListener('message', messageListener);
            clearInterval(checkPopup);

            const userData = event.data.user;

            // --- ZAPAMIĘTYWANIE SESJI DISCORD (NA 12 GODZIN) ---
            const rememberCheckbox = document.getElementById('remember-discord-checkbox');
            if (rememberCheckbox && rememberCheckbox.checked) {
                const sessionData = {
                    user: userData,
                    timestamp: Date.now()
                };
                localStorage.setItem('elcartel_discord_session', JSON.stringify(sessionData));
            }
            // -------------------------------------
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja ról...';
            try {
                const roleRes = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=check_access&discord_id=${userData.id}`);
                const roleData = await roleRes.json();
                
                const hasAccess = roleData.roles && roleData.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));
                
                if (!hasAccess) {
                    showNotice("Odmowa dostępu! Wymagana rola: Statystyki.", "danger");
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                    localStorage.removeItem('elcartel_discord_session');
                    return;
                }

                window.executeReportsLoginSequence(userData, roleData.roles, btn, originalBtnContent);
            } catch(e) {
                console.error("Błąd weryfikacji ról:", e);
                showNotice("Błąd weryfikacji ról!", "danger");
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
                return;
            }
        }
    };

    window.addEventListener('message', messageListener);
};

window.executeReportsLoginSequence = async function(userData, userRoles, btnElement, originalBtnContent) {
    // --- ZABEZPIECZENIE PRZED PODWÓJNYM LOGOWANIEM ---
    if (window.isLoginInProgress) return;
    window.isLoginInProgress = true;

    if (btnElement) btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pobieranie kartoteki...';

    try {
        const res = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=get_employee&discord_id=${userData.id}`);
        const empData = await res.json();

        // Wyznaczanie stanowiska (rangi)
        let detectedRank = "Pracownik"; 
        if (typeof RANK_HIERARCHY !== 'undefined') {
            for (let r of RANK_HIERARCHY) {
                if (userRoles.includes(r.id)) {
                    detectedRank = r.name;
                    break;
                }
            }
        }

        if (empData && empData.ic_name) {
            // Cicha aktualizacja bazy
            if (empData.rank !== detectedRank) {
                fetch("https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports", {
                    method: "POST",
                    body: JSON.stringify({ 
                        action: "boss_edit_employee", 
                        discord_id: userData.id, 
                        ic_name: empData.ic_name, 
                        ssn: empData.ssn, 
                        rank: detectedRank 
                    })
                });
                empData.rank = detectedRank; 
            }

            window.finalizeReportsLogin(userData, empData, btnElement, originalBtnContent);
        } else {
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = originalBtnContent;
            }
            const avatarInput = document.getElementById('setup-avatar');
            if (avatarInput) avatarInput.value = userData.avatar || "";
            
            const modal = document.getElementById('first-login-modal');
            if (modal) modal.classList.remove('hidden');
            
            window.tempDiscordUserData = userData; 
            window.tempDetectedRank = detectedRank; 
            window.isLoginInProgress = false; // Odblokowanie
        }
    } catch (e) {
        console.error("Błąd połączenia z bazą:", e);
        showNotice("Błąd połączenia z bazą Cartelu!", "danger");
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalBtnContent;
        }
        window.isLoginInProgress = false; // Odblokowanie
    }
};

window.saveFirstSetup = async function() {
    const icName = document.getElementById('setup-ic-name').value.trim();
    const ssn = document.getElementById('setup-ssn').value.trim();
    const avatar = document.getElementById('setup-avatar').value.trim();

    if (!icName || !ssn) return showNotice("Wypełnij Imię, Nazwisko i SSN!", "warning");

    const btn = document.getElementById('save-setup-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    const dzis = new Date();
    const dataStr = `${String(dzis.getDate()).padStart(2, '0')}.${String(dzis.getMonth() + 1).padStart(2, '0')}.${dzis.getFullYear()}`;

    try {
        await fetch("https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports", {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_employee',
                discord_id: window.tempDiscordUserData.id,
                ic_name: icName,
                ssn: ssn,
                avatar_url: avatar || window.tempDiscordUserData.avatar,
                date: dataStr
            })
        });

        await fetch("https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports", {
            method: "POST",
            body: JSON.stringify({
                action: "boss_edit_employee",
                discord_id: window.tempDiscordUserData.id,
                ic_name: icName,
                ssn: ssn,
                rank: window.tempDetectedRank
            })
        });

        const modal = document.getElementById('first-login-modal');
        if (modal) modal.classList.add('hidden');
        
        const newEmpData = {
            ic_name: icName,
            ssn: ssn,
            avatar_url: avatar || window.tempDiscordUserData.avatar,
            rank: window.tempDetectedRank
        };
        
        window.finalizeReportsLogin(window.tempDiscordUserData, newEmpData, null, null);
    } catch(e) {
        showNotice("Wystąpił błąd podczas zapisu!", "danger");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
};

window.finalizeReportsLogin = function(userData, empData, btnElement, originalBtnContent) {
    currentEmployeeName = empData.ic_name;
    const nameDisplay = document.getElementById('logged-boss-name');
    if (nameDisplay) nameDisplay.innerText = currentEmployeeName.toUpperCase();

    const rememberCheckbox = document.getElementById('remember-discord-checkbox');
    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('elcartel_discord_session', JSON.stringify(userData));
    }

    const mainIcon = document.querySelector('.login-icon');
    if (mainIcon) {
        const photoUrl = empData.avatar_url || userData.avatar;
        mainIcon.outerHTML = `<img src="${photoUrl}" class="login-icon icon-unlock-anim" style="border-radius: 50%; width: 70px; height: 70px; border: 3px solid #22c55e; margin: 0 auto 20px auto; display: block; background: #0f172a;">`;
    }

    window.addSystemLog('LOGOWANIE', `Zalogowano do panelu statystyk (Postać IC: ${currentEmployeeName} | ${empData.rank}).`);

    const loginCard = document.querySelector('.login-card');
    if (loginCard) loginCard.classList.add('login-zoom-in');

    setTimeout(() => {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.classList.remove('active');
        if (loginCard) loginCard.classList.remove('login-zoom-in');
        
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalBtnContent || `<i class="fab fa-discord"></i> Zaloguj przez Discord`;
        }
        
        const loader = document.getElementById('global-loading-screen');
        const loaderStatus = document.getElementById('loader-status');
        if (loader) loader.classList.remove('hidden');
        if (loaderStatus) loaderStatus.innerText = "Kompilacja danych analitycznych...";
        
        const dashboard = document.getElementById('dashboard-screen');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            dashboard.classList.add('app-zoom-out');
        }
        
        const userProfile = document.getElementById('user-profile');
        if (userProfile) userProfile.classList.remove('hidden');
        
        showNotice(`Zalogowano jako: ${currentEmployeeName}`, "success");
        
        if(typeof window.preloadEmployeesData === 'function') {
            window.preloadEmployeesData().then(d => { if(d.employees) window.currentEmployeesList = d.employees; });
        }

        if(typeof loadRealData === 'function') {
            loadRealData().then(() => {
                if (loaderStatus) loaderStatus.innerText = "Autoryzacja zakończona";
                setTimeout(() => {
                    if (loader) loader.classList.add('hidden');
                    if (dashboard) dashboard.classList.remove('app-zoom-out');
                }, 600);
            }).catch(() => {
                if (loader) loader.classList.add('hidden');
                if (dashboard) dashboard.classList.remove('app-zoom-out');
                showNotice("Uwaga: Wystąpił problem przy ładowaniu statystyk.", "danger");
            });
        }
        
        // --- LIVE ROLE CHECK DLA RAPORTÓW ---
        if (window.accessCheckInterval) clearInterval(window.accessCheckInterval);
        window.accessCheckInterval = setInterval(async () => {
            try {
                const res = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=check_access&discord_id=${userData.id}`);
                const data = await res.json();
                const hasAccess = data.roles && data.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));
                if (!hasAccess) {
                    clearInterval(window.accessCheckInterval);
                    showNotice("Utracono uprawnienia dostępu z poziomu serwera Discord!", "danger");
                    if(typeof window.logoutBoss === 'function') window.logoutBoss(); 
                }
            } catch(e) {}
        }, 60000);

    }, 400);
};

window.checkSavedDiscordSession = async function() {
    const saved = localStorage.getItem('elcartel_discord_session');
    if (!saved) return;

    try {
        const userData = JSON.parse(saved);
        if (!userData || !userData.name) return;

        const roleRes = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=check_access&discord_id=${userData.id}`);
        const roleData = await roleRes.json();
        
        const hasAccess = roleData.roles && roleData.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));

        if (!hasAccess) {
            localStorage.removeItem('elcartel_discord_session');
            return; 
        }

        window.executeReportsLoginSequence(userData, roleData.roles, document.getElementById('login-btn'), document.getElementById('login-btn') ? document.getElementById('login-btn').innerHTML : '');

    } catch (e) {
        console.error("Błąd odczytu sesji:", e);
        localStorage.removeItem('elcartel_discord_session');
    }
};

window.logoutBoss = function() {
	window.isLoginInProgress = false;
    localStorage.removeItem('elcartel_discord_session');
    
    if (window.accessCheckInterval) clearInterval(window.accessCheckInterval);

    window.addSystemLog('WYLOGOWANIE', `Wylogowano z panelu statystyk.`);
    
    const dashboard = document.getElementById('dashboard-screen');
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const mainIcon = document.querySelector('.login-icon');

    const userDropdown = document.getElementById('user-dropdown');
    const userProfile = document.getElementById('user-profile');
    if (userDropdown) userDropdown.classList.remove('active');
    if (userProfile) userProfile.classList.add('hidden');

    if (dashboard) {
        dashboard.classList.remove('app-zoom-out');
        dashboard.classList.add('app-zoom-in');
    }

    setTimeout(() => {
        if (dashboard) {
            dashboard.classList.add('hidden');
            dashboard.classList.remove('app-zoom-in');
        }
        
        if (loginScreen) loginScreen.classList.add('active');
        if (loginCard) loginCard.classList.add('login-zoom-out');

        if (mainIcon) {
            mainIcon.outerHTML = '<i class="fas fa-unlock login-icon"></i>';
            setTimeout(() => {
                const newIcon = document.querySelector('.login-icon');
                if (newIcon) {
                    newIcon.className = 'fas fa-lock login-icon icon-lock-anim';
                }
            }, 550);
        }

        setTimeout(() => {
            location.reload();
        }, 1200);
        
    }, 400);
};

window.checkSavedDiscordSession = async function() {
    const saved = localStorage.getItem('elcartel_discord_session');
    if (!saved) return;

    try {
        const userData = JSON.parse(saved);
        if (!userData || !userData.name) return;

        // Sprawdzanie roli z Discorda na żywo
        const roleRes = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=check_access&discord_id=${userData.id}`);
        const roleData = await roleRes.json();
        
        const hasAccess = roleData.roles && roleData.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));

        if (!hasAccess) {
            localStorage.removeItem('elcartel_discord_session');
            return; // Gracz stracił rolę dostępu do panelu
        }

        // Puszczamy go przez ścieżkę autoryzacji (z przekazaniem wszystkich ról do wyznaczenia stanowiska)
        window.executeReportsLoginSequence(userData, roleData.roles, document.getElementById('login-btn'), document.getElementById('login-btn') ? document.getElementById('login-btn').innerHTML : '');

    } catch (e) {
        console.error("Błąd odczytu sesji:", e);
        localStorage.removeItem('elcartel_discord_session');
    }
};

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
// KARTOTEKA PRACOWNIKÓW IC (MODUŁ ZARZĄDU SUPABASE)
// ==========================================
window.openEmployeeManager = function() {
    const modal = document.getElementById('employee-manager-modal');
    if (modal) modal.classList.remove('hidden');
    window.loadEmployeesDirectory();
};

window.closeEmployeeManager = function() {
    const modal = document.getElementById('employee-manager-modal');
    if (modal) modal.classList.add('hidden');
    const searchInput = document.getElementById('emp-search-input');
    if(searchInput) searchInput.value = ''; // Czyszczenie lupy po zamknięciu
};

window.loadEmployeesDirectory = async function() {
    const tbody = document.getElementById('emp-manager-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych z centrali...</td></tr>';
    
    try {
        const res = await fetch(`${REPORTS_API_URL}?action=get_all_employees&t=${new Date().getTime()}`);
        const data = await res.json();
        
        window.currentEmployeesList = data.employees || [];

        window.updateEmployeeManagerStats();
        window.renderEmployeesTable();
        
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Błąd połączenia z bazą danych Supabase.</td></tr>';
    }
};

window.updateEmployeeManagerStats = function() {
    const countEl = document.getElementById('em-total-count');
    const topActiveEl = document.getElementById('em-top-active');
    const newestEl = document.getElementById('em-newest-emp');
    
    if (!window.currentEmployeesList || window.currentEmployeesList.length === 0) return;

    if (countEl) countEl.innerText = window.currentEmployeesList.length;

    // Wyznaczanie najaktywniejszego pracownika z pobranego wcześniej feeda
    let mostActive = "Brak danych";
    if (window.globalRawFeed && window.globalRawFeed.length > 0) {
        let opsCount = {};
        window.globalRawFeed.forEach(tx => {
            if(tx.employee && tx.employee !== "Nieznany") {
                opsCount[tx.employee] = (opsCount[tx.employee] || 0) + 1;
            }
        });
        let maxOps = 0;
        for (const [emp, count] of Object.entries(opsCount)) {
            if (count > maxOps) {
                maxOps = count;
                mostActive = emp;
            }
        }
    }
    
    if (topActiveEl) {
        topActiveEl.innerHTML = mostActive !== "Brak danych" 
            ? `<span class="clickable-emp" onclick="window.openEmployeeProfile('${mostActive}')"><i class="fas fa-trophy" style="color: var(--success); margin-right: 5px;"></i>${mostActive}</span>` 
            : "Brak danych";
    }

    // --- POPRAWKA: Prawidłowe wyszukiwanie najmłodszego stażem po dacie ---
    let newestEmp = null;
    let latestTimestamp = -Infinity;

    window.currentEmployeesList.forEach(emp => {
        if (emp.hire_date) {
            // Rozbicie daty w formacie DD.MM.YYYY
            const parts = emp.hire_date.split('.'); 
            if (parts.length === 3) {
                // Przekształcenie daty na czas (timestamp), aby móc łatwo porównać która jest większa (nowsza)
                const ts = new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                if (ts > latestTimestamp) {
                    latestTimestamp = ts;
                    newestEmp = emp;
                }
            }
        }
    });

    // Zabezpieczenie: jeśli nikt nie miał poprawnej daty, bierzemy ostatniego z listy
    if (!newestEmp) {
        newestEmp = window.currentEmployeesList[window.currentEmployeesList.length - 1];
    }

    if (newestEl && newestEmp) {
        const nName = newestEmp.ic_name || newestEmp.name || "Nieznany";
        newestEl.innerHTML = `<span class="clickable-emp" onclick="window.openEmployeeProfile('${nName}')"><i class="fas fa-user-plus" style="color: var(--warning); margin-right: 5px;"></i>${nName}</span> <span style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-top: 3px;">Data: ${newestEmp.hire_date || 'Niedawno'}</span>`;
    }
};

window.renderEmployeesTable = function() {
    const tbody = document.getElementById('emp-manager-table-body');
    const searchInput = document.getElementById('emp-search-input');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (!window.currentEmployeesList || window.currentEmployeesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-secondary);">Brak zarejestrowanych pracowników w bazie.</td></tr>';
        return;
    }

    // Filtrowanie z Wyszukiwarki
    let filtered = window.currentEmployeesList;
    if (term) {
        filtered = filtered.filter(emp => {
            const name = (emp.ic_name || emp.name || "").toLowerCase();
            const rank = (emp.rank || "").toLowerCase();
            const ssn = String(emp.ssn || "");
            return name.includes(term) || rank.includes(term) || ssn.includes(term);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 20px;">Brak danych pasujących do wyszukiwania.</td></tr>';
        return;
    }

    // Sortowanie alfabetyczne by domyślnie panował ład
    filtered.sort((a,b) => (a.ic_name || a.name || "").localeCompare(b.ic_name || b.name || ""));

    let html = '';
    filtered.forEach(emp => {
        const avatar = emp.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const empName = emp.ic_name || emp.name || "Nieznany";
        
        // Inteligentne kolory dla rangi
        let rankStyle = "background: rgba(56, 189, 248, 0.1); color: var(--accent-color); border-color: rgba(56, 189, 248, 0.2);";
        if (emp.rank === "Właściciel") rankStyle = "background: rgba(239, 68, 68, 0.15); color: var(--danger); border-color: rgba(239, 68, 68, 0.3);";
        else if (emp.rank === "Kierownik") rankStyle = "background: rgba(245, 158, 11, 0.15); color: var(--warning); border-color: rgba(245, 158, 11, 0.3);";

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 15px; display: flex; align-items: center; gap: 12px;">
                    <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #5865F2; object-fit: cover;">
                    <strong class="clickable-emp" onclick="window.openEmployeeProfile('${empName}')" style="font-size: 1.05rem;" title="Zobacz Akta">${empName}</strong>
                </td>
                <td style="padding: 15px; color: #cbd5e1; font-weight: 500; text-align: center;">${emp.ssn || '---'}</td>
                <td style="padding: 15px; text-align: center;">
                    <span class="emp-rank-badge" style="${rankStyle}">${emp.rank || 'Pracownik'}</span>
                </td>
                <td style="padding: 15px; color: #94a3b8; font-size: 0.85rem; text-align: center;">${emp.hire_date || 'Brak danych'}</td>
                <td style="padding: 15px; text-align: right;">
                    <button onclick="window.openEmployeeProfile('${empName}')" class="emp-action-btn" style="color: var(--success); border-color: rgba(34, 197, 94, 0.3);" title="Przeglądaj Akta"><i class="fas fa-id-badge"></i></button>
                    <button onclick="openEditEmployeeModal('${emp.discord_id}', '${empName}', '${emp.ssn}', '${emp.rank}')" class="emp-action-btn" style="color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);" title="Edytuj profil"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteEmployeeProfile('${emp.discord_id}', '${empName}')" class="emp-action-btn emp-btn-del" title="Zwolnij / Usuń"><i class="fas fa-user-times"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.filterEmployeesTable = function() {
    window.renderEmployeesTable();
};

window.openEditEmployeeModal = function(id, name, ssn, rank) {
    const modal = document.getElementById('edit-employee-modal');
    if (modal) {
        document.getElementById('edit-emp-discord-id').value = id;
        document.getElementById('edit-emp-name').value = name && name !== 'undefined' ? name : '';
        document.getElementById('edit-emp-ssn').value = ssn && ssn !== 'undefined' ? ssn : '';
        document.getElementById('edit-emp-rank').value = rank && rank !== 'undefined' ? rank : 'Pracownik';
        modal.classList.remove('hidden');
    }
};

window.closeEditEmployeeModal = function() {
    const modal = document.getElementById('edit-employee-modal');
    if (modal) modal.classList.add('hidden');
};

window.saveEmployeeEdit = async function() {
    const id = document.getElementById('edit-emp-discord-id').value;
    const name = document.getElementById('edit-emp-name').value.trim();
    const ssn = document.getElementById('edit-emp-ssn').value.trim();
    const rank = document.getElementById('edit-emp-rank').value.trim();

    if (!name) return showNotice("Imię pracownika nie może być puste!", "warning");

    const btn = document.getElementById('btn-save-edit');
    const origText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    btn.disabled = true;

    try {
        await fetch("https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports", {
            method: "POST",
            body: JSON.stringify({
                action: "boss_edit_employee",
                discord_id: id,
                ic_name: name,
                ssn: ssn,
                rank: rank
            })
        });
        
        window.addSystemLog('ZARZĄDZANIE KADRĄ', `Zaktualizowano profil IC pracownika: ${name}.`);
        showNotice("Pomyślnie zaktualizowano kartotekę!", "success");
        window.closeEditEmployeeModal();
        window.loadEmployeesDirectory();
    } catch (e) {
        showNotice("Błąd podczas zapisywania w bazie!", "danger");
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.deleteEmployeeProfile = async function(id, name) {
    if (!confirm(`UWAGA!\nCzy na pewno chcesz bezpowrotnie usunąć kartotekę pracownika: ${name}?\n\n(Dostęp do panelu odbierasz w rolach na serwerze Discord)`)) return;

    try {
        await fetch("https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports", {
            method: "POST",
            body: JSON.stringify({
                action: "boss_delete_employee",
                discord_id: id
            })
        });
        
        window.addSystemLog('ZARZĄDZANIE KADRĄ', `Usunięto kartotekę IC pracownika: ${name}.`);
        showNotice(`Kartoteka ${name} została usunięta z bazy.`, "info");
        window.loadEmployeesDirectory();
    } catch (e) {
        showNotice("Wystąpił błąd podczas usuwania profilu!", "danger");
    }
};

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

// ------------------------------------------
// PROFIL PRACOWNIKA (WIZYTÓWKA) - ZAAWANSOWANA ANALIZA
// ------------------------------------------
window.openEmployeeProfile = function(name) {
    if(!name || name === "Nieznany") return;
    
    // Generowanie głównego modalu jeśli nie istnieje
    if (!document.getElementById('employee-profile-modal')) {
        const profileModalHTML = `
            <div id="employee-profile-modal" class="emp-modal-overlay hidden" style="z-index: 10050;">
                <div class="emp-modal-content" style="max-width: 580px;">
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
    let totalItemsProcessed = 0; // Nowa zmienna licząca wolumen
    
    const feed = window.globalSortedTransactions || [];
    
    // Obliczanie danych analitycznych
    feed.forEach(tx => {
        if (tx.employee === name || tx.employee.toLowerCase() === name.toLowerCase()) {
            ops++;
            activeDays.add(parseDate(tx.date).toLocaleDateString());
            
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
                totalItemsProcessed += i.qty; // Dodawanie sztuk
            });
        }
    });

    const favItem = Object.entries(itemCounts)
        .sort((a,b) => b[1] - a[1])[0] || ["Brak", 0];

    // Pobieranie danych z bazy
    const empData = window.currentEmployeesList.find(e => e.ic_name === name || e.name === name) || {};
    const rank = empData.rank || "Pracownik";
    const ssn = empData.ssn || "Brak danych";
    const hireDate = empData.hire_date || "Nieznana";
    const pluses = empData.pluses || 0;
    const minuses = empData.minuses || 0;
    
    const totalVolume = tBuy + tSell;
    const avgOpsPerDay = activeDays.size > 0 ? (ops / activeDays.size).toFixed(1) : 0;
    const avgDealValue = ops > 0 ? (totalVolume / ops) : 0; // Średni deal

    // Generator Avatara / Inicjałów
    const avatarUrl = empData.avatar_url || '';
    const isDefaultAvatar = !avatarUrl || avatarUrl.includes('embed/avatars') || avatarUrl.includes('default');
    const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);

    const avatarStyle = isDefaultAvatar
        ? "background: var(--bg-color); color: var(--accent-color); font-size: 2.5rem; display: flex; justify-content: center; align-items: center;"
        : "background: var(--bg-color);";

    const avatarContent = isDefaultAvatar
        ? initials
        : `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`;

    // Budowanie UI
    const body = document.getElementById('emp-profile-body');
    if (body) {
        body.innerHTML = `
            <!-- BANNER I AWATAR -->
            <div style="position: relative; margin: -30px -30px 20px -30px; background: linear-gradient(135deg, var(--accent-color), #0284c7); height: 110px;">
                <div style="position: absolute; bottom: -35px; left: 30px; width: 85px; height: 85px; border-radius: 20px; border: 4px solid var(--card-bg); box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 10; ${avatarStyle} cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    ${avatarContent}
                </div>
            </div>
            
            <!-- NAGŁÓWEK (Imię, Ranga, SSN, Data) -->
            <div style="margin-left: 130px; min-height: 55px; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 5px;">
                <h3 style="font-size: 1.7rem; font-weight: 900; margin: 0; line-height: 1.1; color: var(--text-primary);">${name}</h3>
                <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center;">
                    <span class="emp-rank-badge" style="background: var(--warning-bg); color: var(--warning); border-color: var(--warning); padding: 4px 10px;"><i class="fas fa-briefcase" style="margin-right: 4px;"></i>${rank}</span>
                    <span class="qty-badge" style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); padding: 4px 10px; font-size: 0.8rem;">SSN: ${ssn}</span>
                    <span class="qty-badge" style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); padding: 4px 10px; font-size: 0.8rem;"><i class="fas fa-calendar-alt" style="margin-right: 4px; color: var(--text-secondary);"></i>Od: ${hireDate}</span>
                </div>
            </div>

            <div style="padding-top: 25px;">
                <!-- GŁÓWNE STATYSTYKI (GRID 4 PÓL) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <!-- Kafelek z naprawionym dolarem -->
                    <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 15px 20px; text-align: left; position: relative; overflow: hidden;">
                        <i class="fas fa-dollar-sign" style="position: absolute; right: 10px; bottom: 5px; font-size: 3.5rem; opacity: 0.05; color: var(--accent-color); line-height: 1;"></i>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-weight: 800;">Suma Obrotu</div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-color); position: relative; z-index: 2;">${window.formatMoney(totalVolume)}$</div>
                    </div>
                    
                    <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 15px 20px; text-align: left;">
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-weight: 800;">Operacji łącznie</div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: white;">${ops}</div>
                    </div>

                    <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 15px 20px; text-align: left;">
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-weight: 800;">Średnia wielkość dealu</div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: var(--success);">${window.formatMoney(avgDealValue)}$</div>
                    </div>

                    <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 15px 20px; text-align: left;">
                        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; font-weight: 800;">Przetworzone towary</div>
                        <div style="font-size: 1.6rem; font-weight: 900; color: var(--warning);">${totalItemsProcessed} szt.</div>
                    </div>
                </div>

                <!-- SZCZEGÓŁY (PIONOWA LISTA) -->
                <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
                    <div class="insight-row">
                        <span class="insight-label"><i class="fas fa-chart-line" style="margin-right: 8px; color: var(--text-secondary);"></i> Efektywność</span>
                        <span class="insight-value" style="color:var(--success);">${avgOpsPerDay} op/dzień</span>
                    </div>
                    <div class="insight-row">
                        <span class="insight-label"><i class="far fa-clock" style="margin-right: 8px; color: var(--text-secondary);"></i> Ostatnio widziany</span>
                        <span class="insight-value" style="color:var(--accent-color);">${lastActive}</span>
                    </div>
                    <div class="insight-row">
                        <span class="insight-label"><i class="fas fa-star" style="margin-right: 8px; color: var(--text-secondary);"></i> Specjalizacja</span>
                        <span class="insight-value" style="color:var(--warning);">${favItem[0]} (${favItem[1]} szt.)</span>
                    </div>
                    <div class="insight-row">
                        <span class="insight-label"><i class="fas fa-trophy" style="margin-right: 8px; color: var(--text-secondary);"></i> Rekordowy deal</span>
                        <span class="insight-value"><i class="fas fa-dollar-sign" style="color: var(--success); margin-right: 3px;"></i>${window.formatMoney(maxDeal)}</span>
                    </div>

                    <!-- ROZBUDOWANY BALANS SKUP VS SPRZEDAŻ -->
                    <div style="margin-top: 10px; padding-top: 15px; border-top: 1px dashed rgba(255,255,255,0.08);">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; margin-bottom: 10px;">
                            <span><i class="fas fa-shopping-basket" style="color: var(--danger); margin-right: 5px;"></i> Skup: ${window.formatMoney(tBuy)}$</span>
                            <span><i class="fas fa-truck-loading" style="color: var(--success); margin-right: 5px;"></i> Sprzedaż: ${window.formatMoney(tSell)}$</span>
                        </div>
                        <div style="height: 8px; background: rgba(0,0,0,0.5); border-radius: 10px; overflow: hidden; display: flex; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="height: 100%; width: ${totalVolume > 0 ? (tBuy / totalVolume) * 100 : 50}%; background: var(--danger); transition: 1s;"></div>
                            <div style="height: 100%; width: ${totalVolume > 0 ? (tSell / totalVolume) * 100 : 50}%; background: var(--success); transition: 1s;"></div>
                        </div>
                    </div>
                    
                    <!-- PASEK DOŚWIADCZENIA -->
                    <div style="margin-top: 15px;">
                        ${(function() {
                            const now = new Date().getTime();
                            const oneDay = 24 * 60 * 60 * 1000;
                            let recentOps = 0;
                            let daysSinceLast = Infinity;

                            // Szybkie przeliczenie aktywności w czasie
                            feed.forEach(tx => {
                                if (tx.employee === name || tx.employee.toLowerCase() === name.toLowerCase()) {
                                    const txTime = parseDate(tx.date).getTime();
                                    const daysAgo = (now - txTime) / oneDay;
                                    
                                    if (daysAgo < daysSinceLast) daysSinceLast = daysAgo;
                                    if (daysAgo <= 14) recentOps++; // Liczymy tylko operacje z ostatnich 2 tygodni
                                }
                            });

                            let engStatus = "Brak danych";
                            let engColor = "var(--text-secondary)";
                            let engPct = 0;

                            // Algorytm oceny zaangażowania
                            if (daysSinceLast > 14 || recentOps === 0) {
                                engStatus = "Nieaktywny";
                                engColor = "var(--danger)";
                                engPct = 5; // Minimalny widoczny pasek
                            } else if (daysSinceLast > 7) {
                                engStatus = "Słabnące";
                                engColor = "var(--warning)";
                                engPct = 25;
                            } else if (recentOps >= 20) {
                                engStatus = "Wzorowe";
                                engColor = "var(--success)";
                                engPct = 100;
                            } else if (recentOps >= 10) {
                                engStatus = "Wysokie";
                                engColor = "var(--accent-color)"; // Niebieski akcent
                                engPct = 75;
                            } else if (recentOps >= 4) {
                                engStatus = "Stabilne";
                                engColor = "var(--warning)";
                                engPct = 50;
                            } else {
                                engStatus = "Niskie";
                                engColor = "var(--danger)";
                                engPct = 20;
                            }

                            return `
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase; margin-bottom: 8px;">
                                    <span>Zaangażowanie (Ostatnie 14 dni)</span>
                                    <span style="color: ${engColor};">${engStatus}</span>
                                </div>
                                <div class="trust-bar-container" style="height: 8px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05); margin-top: 0; border-radius: 10px;">
                                    <div class="trust-bar-fill" style="width: ${engPct}%; background: ${engColor}; box-shadow: 0 0 10px ${engColor}; transition: width 1s;"></div>
                                </div>
                            `;
                        })()}
                    </div>
                </div>

                <!-- REPUTACJA -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(34, 197, 94, 0.05), rgba(239, 68, 68, 0.05)); padding: 15px 25px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <button class="rep-btn add" onclick="window.updateReputation('${name}', 'plus')" title="Dodaj plusa" style="box-shadow: 0 4px 10px rgba(34, 197, 94, 0.15);">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px;">Pochwały</span>
                            <span class="rep-score plus" id="prof-plus-val" style="font-size: 1.6rem; line-height: 1; margin-top: 2px;">${pluses}</span>
                        </div>
                    </div>
                    
                    <div style="height: 35px; width: 1px; background: rgba(255,255,255,0.1);"></div>

                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="display: flex; flex-direction: column; text-align: right;">
                            <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 800; letter-spacing: 1px;">Kary</span>
                            <span class="rep-score minus" id="prof-minus-val" style="font-size: 1.6rem; line-height: 1; margin-top: 2px;">${minuses}</span>
                        </div>
                        <button class="rep-btn sub" onclick="window.updateReputation('${name}', 'minus')" title="Dodaj minusa" style="box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15);">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                    </div>
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
// Pomocnicza funkcja do sumowania kwot premii
window.addBonusAmount = function(amount) {
    const input = document.getElementById('new-bonus-amount');
    const currentVal = parseFloat(input.value) || 0;
    input.value = currentVal + amount;
};

window.openBonusesManager = async function() {
    document.getElementById('bonuses-manager-modal').classList.remove('hidden');
    const listContainer = document.getElementById('new-bonus-emp-list');
    listContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych...</span>';
    
    try {
        const res = await fetch(`${REPORTS_API_URL}?action=get_all_employees&t=${new Date().getTime()}`);
        const data = await res.json();
        if (data.employees) {
            window.currentEmployeesList = data.employees;
        }
    } catch (e) {
        console.error("Nie udało się odświeżyć bazy pracowników", e);
    }

    listContainer.innerHTML = ''; 
    
    // Funkcja do aktualizacji stanu przycisku Zaznacz/Odznacz Wszystkich
    const updateSelectAllBtnState = () => {
        const all = listContainer.querySelectorAll('.emp-bonus-pill').length;
        const selected = listContainer.querySelectorAll('.emp-bonus-pill.selected').length;
        const btn = document.getElementById('select-all-bonus-btn');
        if(!btn) return;
        
        if(all > 0 && selected === all) {
            btn.innerHTML = '<i class="fas fa-times"></i> Odznacz wszystkich';
            btn.style.color = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.1)';
            btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        } else {
            btn.innerHTML = '<i class="fas fa-check-double"></i> Zaznacz wszystkich';
            btn.style.color = 'var(--accent-color)';
            btn.style.background = 'rgba(56, 189, 248, 0.1)';
            btn.style.borderColor = 'rgba(56, 189, 248, 0.3)';
        }
    };

    const selectAllBtn = document.createElement('div');
    selectAllBtn.id = 'select-all-bonus-btn';
    selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Zaznacz wszystkich';
    selectAllBtn.style.cssText = 'width: 100%; padding: 8px; background: rgba(56, 189, 248, 0.1); color: var(--accent-color); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; text-align: center; cursor: pointer; font-size: 0.8rem; font-weight: 800; margin-bottom: 5px; transition: 0.2s; user-select: none;';
    
    selectAllBtn.onclick = function() {
        const allPills = listContainer.querySelectorAll('.emp-bonus-pill');
        const selectedPills = listContainer.querySelectorAll('.emp-bonus-pill.selected');
        
        if (selectedPills.length === allPills.length) {
            // Skoro wszyscy są zaznaczeni -> odznacz wszystkich
            allPills.forEach(p => {
                p.classList.remove('selected');
                p.style.background = 'rgba(255,255,255,0.05)';
                p.style.color = 'var(--text-primary)';
                p.style.borderColor = 'rgba(255,255,255,0.1)';
                p.style.boxShadow = 'none';
            });
        } else {
            // Zaznacz wszystkich (tylko tych jeszcze niezaznaczonych, by nie psuć CSS)
            const unselectedPills = listContainer.querySelectorAll('.emp-bonus-pill:not(.selected)');
            unselectedPills.forEach(p => {
                p.classList.add('selected');
                p.style.background = 'var(--warning)';
                p.style.color = '#000';
                p.style.borderColor = 'var(--warning)';
                p.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
            });
        }
        updateSelectAllBtnState(); // Odśwież wygląd przycisku
    };
    listContainer.appendChild(selectAllBtn);

    if (window.currentEmployeesList && window.currentEmployeesList.length > 0) {
        window.currentEmployeesList.forEach(emp => {
            const empName = emp.ic_name || emp.name;
            if (empName) {
                const pill = document.createElement('div');
                pill.className = 'emp-bonus-pill';
                pill.dataset.value = empName;
                pill.innerHTML = `<i class="fas fa-user" style="margin-right: 5px;"></i>${empName}`;
                
                pill.style.cssText = 'padding: 6px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; cursor: pointer; font-size: 0.8rem; color: var(--text-primary); transition: all 0.2s; user-select: none; display: flex; align-items: center;';
                
                pill.onclick = function() {
                    this.classList.toggle('selected');
                    if (this.classList.contains('selected')) {
                        this.style.background = 'var(--warning)';
                        this.style.color = '#000';
                        this.style.borderColor = 'var(--warning)';
                        this.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.4)';
                    } else {
                        this.style.background = 'rgba(255,255,255,0.05)';
                        this.style.color = 'var(--text-primary)';
                        this.style.borderColor = 'rgba(255,255,255,0.1)';
                        this.style.boxShadow = 'none';
                    }
                    updateSelectAllBtnState(); // Sprawdź, czy trzeba zmienić główny przycisk
                };
                
                listContainer.appendChild(pill);
            }
        });
    } else {
        listContainer.innerHTML = '<span style="color: var(--danger); font-size: 0.85rem;">Brak pracowników w bazie.</span>';
    }
    
    await window.loadBonusesToTable();
}

window.closeBonusesManager = function() {
    document.getElementById('bonuses-manager-modal').classList.add('hidden');
}

window.loadBonusesToTable = async function() {
    const tbody = document.getElementById('bonuses-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Ładowanie danych...</td></tr>';
    
    try {
        const data = await window.preloadBonusesData();
        window.globalBonuses = data.bonuses || [];

        window.updateBonusStats();
        window.renderBonusesTable();
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger);">Błąd połączenia z bazą!</td></tr>';
    }
}

window.renderBonusesTable = function() {
    const tbody = document.getElementById('bonuses-table-body');
    if(!tbody) return;
    const searchInput = document.getElementById('bonus-search-input');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtered = window.globalBonuses || [];
    
    if (term) {
        filtered = filtered.filter(b => 
            (b.employee || "").toLowerCase().includes(term) ||
            (b.reason || "").toLowerCase().includes(term) ||
            String(b.amount).includes(term)
        );
    }

    if (filtered.length > 0) {
        const sortedBonuses = filtered.sort((a,b) => {
            const dateA = typeof parseDate === 'function' ? parseDate(a.date).getTime() : new Date(a.date).getTime();
            const dateB = typeof parseDate === 'function' ? parseDate(b.date).getTime() : new Date(b.date).getTime();
            return dateB - dateA;
        });
        
        tbody.innerHTML = sortedBonuses.map(b => {
            let displayDate = b.date;
            if (typeof displayDate === 'string' && displayDate.includes('T')) {
                displayDate = new Date(displayDate).toLocaleString('pl-PL');
            }
            return `
                <tr>
                    <td style="font-size: 0.8rem; color: var(--text-secondary);">${displayDate}</td>
                    <td><strong class="clickable-emp" onclick="window.openEmployeeProfile('${b.employee}')"><i class="fas fa-user-circle"></i> ${b.employee}</strong></td>
                    <td><span style="color: var(--text-primary); font-size: 0.9rem;">${b.reason || '-'}</span></td>
                    <td style="text-align: right; color: var(--warning); font-weight: 900;">${window.formatMoney ? window.formatMoney(b.amount) : b.amount}$</td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: 20px;">Brak danych pasujących do wyszukiwania.</td></tr>';
    }
};

window.filterBonusesTable = function() {
    window.renderBonusesTable();
};

window.updateBonusStats = function() {
    let totalPaid = 0;
    let totalCount = (window.globalBonuses || []).length;
    let employeeTotals = {};

    (window.globalBonuses || []).forEach(b => {
        const amt = parseFloat(b.amount) || 0;
        totalPaid += amt;
        employeeTotals[b.employee] = (employeeTotals[b.employee] || 0) + amt;
    });

    let topEmployee = "Brak danych";
    let maxBonusVal = 0;
    for (const [emp, val] of Object.entries(employeeTotals)) {
        if (val > maxBonusVal) {
            maxBonusVal = val;
            topEmployee = emp;
        }
    }

    const totalEl = document.getElementById('bm-total-bonuses');
    const countEl = document.getElementById('bm-total-count');
    const topEl = document.getElementById('bm-top-employee');

    if(totalEl) totalEl.innerText = (window.formatMoney ? window.formatMoney(totalPaid) : totalPaid) + '$';
    if(countEl) countEl.innerText = totalCount;
    if(topEl) {
        topEl.innerHTML = topEmployee !== "Brak danych" 
            ? `<span class="clickable-emp" onclick="window.openEmployeeProfile('${topEmployee}')">${topEmployee}</span> <span style="display:block; font-size: 0.8rem; color: var(--warning); margin-top: 3px;">(${(window.formatMoney ? window.formatMoney(maxBonusVal) : maxBonusVal)}$)</span>` 
            : "Brak danych";
    }
};

window.addBonus = async function() {
    const btn = document.getElementById('add-bonus-btn');
    const amountInput = document.getElementById('new-bonus-amount');
    const reasonInput = document.getElementById('new-bonus-reason');

    const selectedPills = document.querySelectorAll('#new-bonus-emp-list .emp-bonus-pill.selected');
    const selectedEmployees = Array.from(selectedPills).map(pill => pill.dataset.value);
    
    const amount = parseFloat(amountInput.value);
    const reason = reasonInput.value.trim();

    if (selectedEmployees.length === 0) return typeof showNotice === 'function' ? showNotice("Wybierz co najmniej jednego pracownika z listy klikając w niego!", "danger") : alert("Wybierz pracownika");
    if (isNaN(amount) || amount <= 0) return typeof showNotice === 'function' ? showNotice("Wprowadź poprawną kwotę!", "danger") : alert("Błędna kwota");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wypłacanie...';
    if(typeof showNotice === 'function') showNotice(`Przetwarzanie premii dla ${selectedEmployees.length} pracowników...`, "info");

    try {
        const bossNameEl = document.getElementById('logged-boss-name');
        const bossName = bossNameEl ? bossNameEl.innerText : "Szef";

        const bonusPromises = selectedEmployees.map(employee => {
            return fetch(typeof REPORTS_API_URL !== 'undefined' ? REPORTS_API_URL : '', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'save_bonus',
                    employee: employee,
                    amount: amount,
                    reason: reason,
                    boss: bossName 
                })
            });
        });

        await Promise.all(bonusPromises);
        
        const empListString = selectedEmployees.join(', ');
        if(typeof window.addSystemLog === 'function') {
            window.addSystemLog('PREMIA ZBIORCZA', `Wypłacono premię (każdy po ${window.formatMoney ? window.formatMoney(amount) : amount}$) dla: ${empListString} (Tytuł: ${reason || 'Brak tytułu'})`);
        }

        window.bonusesFetchPromise = null;
        await window.loadBonusesToTable();
        window.reportsFetchPromise = null;
        if(typeof loadRealData === 'function') await loadRealData(); 
        
        if(typeof showNotice === 'function') showNotice(`Sukces! Wypłacono premie dla ${selectedEmployees.length} osób.`, "success");

        amountInput.value = '';
        reasonInput.value = '';
        
        selectedPills.forEach(pill => {
            pill.classList.remove('selected');
            pill.style.background = 'rgba(255,255,255,0.05)';
            pill.style.color = 'var(--text-primary)';
            pill.style.borderColor = 'rgba(255,255,255,0.1)';
            pill.style.boxShadow = 'none';
        });

    } catch (e) {
        if(typeof showNotice === 'function') showNotice("Wystąpił błąd podczas nadawania premii!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Zatwierdź i Wypłać';
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
            
            // --- POPRAWKA: Pobieranie ID Discorda z zapisanej sesji i przekazanie go w nagłówku ---
            const savedSession = JSON.parse(localStorage.getItem('elcartel_discord_session') || '{}');
            const discordId = savedSession.user ? savedSession.user.id : (savedSession.id || "brak");

            const res = await fetch(BOSS_DISCORD_WEBHOOK, { 
                method: "POST", 
                headers: {
                    "X-Discord-ID": discordId
                },
                body: formData 
            });
            // --------------------------------------------------------------------------------------
            
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
    
    // --- URUCHOMIENIE SPRAWDZANIA SESJI DISCORD ---
    if (typeof window.checkSavedDiscordSession === 'function') window.checkSavedDiscordSession();
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

window.checkSavedDiscordSession = async function() {
    const saved = localStorage.getItem('elcartel_discord_session');
    if (!saved) return;

    try {
        const sessionData = JSON.parse(saved);
        
        // Kompatybilność wsteczna z nowymi (z czasem) i starymi logowaniami
        const userData = sessionData.user ? sessionData.user : sessionData;
        const timestamp = sessionData.timestamp || 0;
        const TWELVE_HOURS = 43200000;
        
        // Wyrzucamy, jeśli minęło 12 godzin
        if (timestamp > 0 && (Date.now() - timestamp > TWELVE_HOURS)) {
            console.log("[System] Zapisana sesja wygasła po 12h. Wymagane ponowne logowanie.");
            localStorage.removeItem('elcartel_discord_session');
            return;
        }

        if (!userData || !userData.id) return;

        // Odświeżanie tokenów ról na żywo
        const roleRes = await fetch(`https://elcartel-wbhk.bcjds9j7ht.workers.dev/reports?action=check_access&discord_id=${userData.id}`);
        const roleData = await roleRes.json();
        
        const hasAccess = roleData.roles && roleData.roles.some(r => ALLOWED_DISCORD_ROLES.includes(r));

        if (!hasAccess) {
            localStorage.removeItem('elcartel_discord_session');
            return; 
        }

        const btn = document.getElementById('login-btn');
        const btnHTML = btn ? btn.innerHTML : '';
        window.executeReportsLoginSequence(userData, roleData.roles, btn, btnHTML);

    } catch (e) {
        console.error("Błąd odczytu sesji:", e);
        localStorage.removeItem('elcartel_discord_session');
    }
};

// ==========================================
// BEZPIECZNE WYLOGOWANIE Z SYSTEMU (RAPORTY)
// ==========================================
window.logoutBoss = function() {
    // --- CZYSZCZENIE TRWAŁEJ SESJI DISCORD ---
    localStorage.removeItem('elcartel_discord_session');
    
    // --- LIVE ROLE CHECK - CZYSZCZENIE INTERWAŁU ---
    if (window.accessCheckInterval) clearInterval(window.accessCheckInterval);
    // -------------------------------------------------------------

    window.addSystemLog('WYLOGOWANIE', `Wylogowano z panelu statystyk.`);
    
    const dashboard = document.getElementById('dashboard-screen');
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const mainIcon = document.querySelector('.login-icon');

    // Ukrywanie profilu i zamykanie menu
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('user-profile').classList.add('hidden');

    if (dashboard) {
        dashboard.classList.remove('app-zoom-out');
        dashboard.classList.add('app-zoom-in');
    }

    setTimeout(() => {
        if (dashboard) {
            dashboard.classList.add('hidden');
            dashboard.classList.remove('app-zoom-in');
        }
        
        if (loginScreen) loginScreen.classList.add('active');
        if (loginCard) loginCard.classList.add('login-zoom-out');

        // Przywracamy kłódkę (zamiana z Avatara Discorda)
        if (mainIcon) {
            mainIcon.outerHTML = '<i class="fas fa-unlock login-icon"></i>';
            setTimeout(() => {
                const newIcon = document.querySelector('.login-icon');
                if (newIcon) {
                    newIcon.className = 'fas fa-lock login-icon icon-lock-anim';
                }
            }, 550);
        }

        // Twardy restart strony dla pełnego wyczyszczenia pamięci podręcznej wykresów
        setTimeout(() => {
            location.reload();
        }, 1200);
        
    }, 400);
};

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