const APP_VERSION = "4.2.3";
let LATEST_CHANGELOG_VERSION = APP_VERSION; 

const DISCORD_WEBHOOK_URL_SKUP = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/skup"; 
const DISCORD_WEBHOOK_URL_EXPORT = "https://elcartel-wbhk.bcjds9j7ht.workers.dev/export";
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

let currentEmployeeName = ""; 
let currentEmployeeRank = "Pracownik"; 
let currentEmployeeSsn = "---"; 
let currentEmployeeDateZatrudnienia = "---"; 
let currentEmployeePhoto = ""; 
let currentActiveView = 'skup';

let showImagesSkup = localStorage.getItem('elcartel_images_skup') !== 'false';
let showImagesExport = localStorage.getItem('elcartel_images_export') !== 'false';

let myStatsRawData = [];
let myBonusesRawData = [];
let currentStatsType = 'skup';
let currentStatsRange = 'today';
let currentReportReceiptId = ""; 

// Zmienna przechowująca dane wyszukanego klienta (Karty Lojalnościowe)
let currentLoyaltyCustomer = null;

// ZMIENNE DLA WIDŻETU ONLINE I INTELIGENTNEGO PRE-LOADINGU
let onlineCheckInterval = null;
window.currentEmployeesList = [];
window.reportsFetchPromise = null;
window.bonusesFetchPromise = null;
window.errorReportsFetchPromise = null;

// ==========================================
// UNIWERSALNY SYSTEM LOGOWANIA DO BAZY (DZIENNIK ZDARZEŃ)
// ==========================================
window.addSystemLog = async function(type, description) {
    const who = window.currentEmployeeName || currentEmployeeName || "Nieznany Pracownik";
    try {
        fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_log',
                employee: who,
                type: type,
                description: description
            })
        });
    } catch (e) {
        console.error("Błąd zapisu logu:", e);
    }
};

// ==========================================
// SYSTEM ODTWARZANIA DŹWIĘKÓW SYSTEMOWYCH
// ==========================================
window.playSystemSound = function(soundName) {
    const audioEnabled = localStorage.getItem('elcartel_audio_enabled') !== 'false';
    if (!audioEnabled) return;
    try {
        const audio = new Audio(`audio/${soundName}.mp3`);
        audio.play();
    } catch (e) {
        console.error("Błąd odtwarzania dźwięku:", e);
    }
};

// Funkcje inteligentnego pobierania danych w tle (Predictive Fetch)
window.preloadReportsData = function() {
    if (!window.reportsFetchPromise) {
        window.reportsFetchPromise = fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => {
                window.reportsFetchPromise = null;
                return [];
            });
    }
    return window.reportsFetchPromise;
};

window.preloadBonusesData = function() {
    if (!window.bonusesFetchPromise) {
        window.bonusesFetchPromise = fetch(`${REPORTS_API_URL}?action=get_bonuses&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => {
                window.bonusesFetchPromise = null;
                return { bonuses: [] };
            });
    }
    return window.bonusesFetchPromise;
};

window.preloadErrorReportsData = function() {
    if (!window.errorReportsFetchPromise) {
        window.errorReportsFetchPromise = fetch(`${REPORTS_API_URL}?action=get_error_reports&t=${new Date().getTime()}`)
            .then(res => res.json())
            .catch(err => {
                window.errorReportsFetchPromise = null;
                return [];
            });
    }
    return window.errorReportsFetchPromise;
};

window.formatMoney = function(amount) {
    if (isNaN(amount)) return "0";
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// --- EFEKTY CYFROWEGO ODLICZANIA I PULSOWANIA ---
window.animateValue = function(element, start, end, duration) {
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 5); // Płynne zwalnianie na końcu
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        element.innerText = currentVal + '$';
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.innerText = end + '$';
        }
    };
    window.requestAnimationFrame(step);
};

window.triggerPulseEffect = function(totalId, badgeId) {
    const totalEl = document.getElementById(totalId);
    const badgeEl = badgeId ? document.getElementById(badgeId) : null;
    if (totalEl) {
        totalEl.classList.remove('pulse-anim');
        void totalEl.offsetWidth; // Wymuszenie resetu animacji w CSS
        totalEl.classList.add('pulse-anim');
    }
    if (badgeEl) {
        badgeEl.classList.remove('pulse-anim');
        void badgeEl.offsetWidth;
        badgeEl.classList.add('pulse-anim');
    }
};
// ------------------------------------------------

function isTravisVance() {
    return currentEmployeeName && currentEmployeeName.trim().toLowerCase() === "travis vance";
}

const defaultInventory = [
    { name: "Zdobiona książka", min: 120, max: 120, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_book.webp" },
    { name: "Dywan", min: 240, max: 240, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_carpet.webp" },
    { name: "Komputer (laptop)", min: 600, max: 600, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_computer.webp" },
    { name: "Komputer (stacjonarny)", min: 680, max: 680, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_computer2.webp" },
    { name: "Konsola", min: 400, max: 400, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_console.webp" },
    { name: "Konsola DJ", min: 640, max: 640, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_djconsole.webp" },
    { name: "Kobieca plastikowa figurka", min: 100, max: 100, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_figure.webp" },
    { name: "Plastikowa figurka małpki", min: 80, max: 80, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_figure2.webp" },
    { name: "Kwiat", min: 65, max: 65, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_flower.webp" },
    { name: "Gitara elektryczna", min: 480, max: 480, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_guitar.webp" },
    { name: "Dziwna substancja", min: 100, max: 100, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_jerrycan.webp" },
    { name: "Dziwna szara substancja", min: 160, max: 160, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_jerrycan2.webp" },
    { name: "Biżuteria", min: 240, max: 240, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_jewelery.webp" },
    { name: "Brudna biżuteria", min: 150, max: 150, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_jewelery.webp" },
    { name: "Katana", min: 480, max: 480, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_katana.webp" },
    { name: "Mikrofala", min: 280, max: 280, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_microwave.webp" },
    { name: "Mikser", min: 160, max: 160, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_mixer.webp" },
    { name: "Monitor", min: 150, max: 150, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_monitor.webp" },
    { name: "Obraz", min: 115, max: 115, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_painting.webp" },
    { name: "Obraz ścienny", min: 180, max: 180, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_paiting2.webp" },
    { name: "Głośnik", min: 145, max: 145, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_speaker.webp" },
    { name: "Telewizor", min: 600, max: 600, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_tv.webp" },
    { name: "Zegarek", min: 160, max: 160, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_watch.webp" },
    { name: "Złota bransoletka", min: 200, max: 200, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/goldenbracelet.webp" },
    { name: "Złota moneta", min: 200, max: 200, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/goldcoin.webp" },
    { name: "Złota moneta z prezydentem", min: 200, max: 200, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/prescoin42.webp" },
    { name: "Złote kolczyki", min: 200, max: 200, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/goldenearrings.webp" },
    { name: "Popsuty telefon", min: 95, max: 95, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/brokenphone.webp" },
	{ name: "Muszle morskie", min: 120, max: 120, category: "inne", image: "" },
	{ name: "Mała szara muszla", min: 90, max: 90, category: "inne", image: "" },
	{ name: "Gwiazda morska", min: 80, max: 80, category: "inne", image: "" },
	{ name: "Ząb rekina", min: 90, max: 90, category: "inne", image: "" },
	{ name: "Stary płaszcz piracki", min: 350, max: 350, category: "inne", image: "" },
	{ name: "Różowa perła", min: 550, max: 550, category: "inne", image: "" },
	{ name: "Zniszczona flaga piratów", min: 300, max: 300, category: "inne", image: "" },
	{ name: "Kapelusz piracki", min: 350, max: 350, category: "inne", image: "" },
	{ name: "Szkatuła ze złotymi łańcuchami", min: 750, max: 750, category: "inne", image: "" },
	{ name: "Zabytkowa szabla", min: 600, max: 600, category: "inne", image: "" },
	{ name: "Legendarna fajka", min: 800, max: 800, category: "inne", image: "" }
];

let inventory = [];
let counts = {};
let currentCategory = 'wszystkie';
let currentMinTotal = 0; 
let currentMaxTotal = 0; 
let isStatAddedForCurrentReceipt = false;
let currentCustomerSSN = "";

const defaultExportInventory = [
    { name: "Zdobiona książka", price: 150, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_book.webp" },
    { name: "Dywan", price: 300, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_carpet.webp" },
    { name: "Komputer (laptop)", price: 750, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_computer.webp" },
    { name: "Komputer (stacjamarny)", price: 850, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_computer2.webp" },
    { name: "Konsola", price: 500, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_console.webp" },
    { name: "Konsola DJ", price: 800, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_djconsole.webp" },
    { name: "Kobieca plastikowa figurka", price: 120, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_figure.webp" },
    { name: "Stara zapalniczka", price: 22, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/metallighter.webp" },
    { name: "Plastikowa figurka małpki", price: 100, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_figure2.webp" },
    { name: "Kwiat", price: 80, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_flower.webp" },
    { name: "Gitara elektryczna", price: 600, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_guitar.webp" },
    { name: "Dziwna substancja", price: 120, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_jerrycan.webp" },
    { name: "Dziwna szara substancja", price: 200, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_jerrycan2.webp" },
    { name: "Biżuteria", price: 300, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_jewelery.webp" },
    { name: "Brudna biżuteria", price: 180, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_jewelery.webp" },
    { name: "Katana", price: 600, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/hr_katana.webp" },
    { name: "Mikrofala", price: 350, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_microwave.webp" },
    { name: "Mikser", price: 200, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_mixer.webp" },
    { name: "Monitor", price: 180, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_monitor.webp" },
    { name: "Obraz", price: 140, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_painting.webp" },
    { name: "Obraz ścienny", price: 220, category: "dom", image: "https://img.realmgaming.eu/onbeat/items/hr_paiting2.webp" },
    { name: "Głośnik", price: 180, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_speaker.webp" },
    { name: "Telewizor", price: 750, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/hr_tv.webp" },
    { name: "Zegarek", price: 200, category: "biżuteria", image: "https://img.realmgaming.eu/onbeat/items/hr_watch.webp" },
    { name: "Stary popsuty telefon", price: 110, category: "elektronika", image: "https://img.realmgaming.eu/onbeat/items/brokenphone.webp" },
    { name: "Sztabka złota", price: 15000, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/sztabka_zlota.webp" },
    { name: "Złota moneta z prezydentem", price: 250, category: "inne", image: "https://img.realmgaming.eu/onbeat/items/prescoin42.webp" },
	{ name: "Muszle morskie", price: 144, category: "inne", image: "" },
	{ name: "Mała szara muszla", price: 108, category: "inne", image: "" },
	{ name: "Gwiazda morska", price: 96, category: "inne", image: "" },
	{ name: "Ząb rekina", price: 108, category: "inne", image: "" },
	{ name: "Stary płaszcz piracki", price: 420, category: "inne", image: "" },
	{ name: "Różowa perła", price: 660, category: "inne", image: "" },
	{ name: "Zniszczona flaga piratów", price: 360, category: "inne", image: "" },
	{ name: "Kapelusz piracki", price: 420, category: "inne", image: "" },
	{ name: "Szkatuła ze złotymi łańcuchami", price: 900, category: "inne", image: "" },
	{ name: "Zabytkowa szabla", price: 720, category: "inne", image: "" },
];

let exportInventory = [];
let countsExport = {};
let currentCategoryExport = 'wszystkie';
let currentTotalExport = 0;
let lastGeneratedReportID = ""; 
let currentCustomerSSNExport = "";

function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
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

function generateID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = 'EC-';
    for(let i=0; i<8; i++) res += chars[Math.floor(Math.random()*chars.length)];
    return res;
}

// ==========================================================================
// OBSŁUGA SCROLLA (ZWIJANIE NAVBARA I ZAMYKANIE MENU PROFILU)
// ==========================================================================
document.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Automatycznie zamyka rozwijane menu profilu, gdy tylko zaczniesz scrollować
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown && userDropdown.classList.contains('active')) {
        userDropdown.classList.remove('active');
    }
});

// ==========================================================================
// ZAMYKANIE MENU PROFILU PO KLIKNIĘCIU W TŁO (POZA MENU)
// ==========================================================================
document.addEventListener('click', function(event) {
    const userDropdown = document.getElementById('user-dropdown');
    
    // Uruchamiamy sprawdzanie tylko, jeśli menu jest aktualnie otwarte
    if (userDropdown && userDropdown.classList.contains('active')) {
        // Sprawdzamy czy kliknięto wewnątrz samego menu (żeby się nie zamknęło jak klikasz opcję)
        const isClickInsideMenu = userDropdown.contains(event.target);
        // Sprawdzamy czy kliknięto w przycisk otwierający profil
        const isClickOnToggleBtn = event.target.closest('#profile-toggle-btn');
        
        // Jeśli kliknięto gdzieś w tło okna przeglądarki - zamknij menu
        if (!isClickInsideMenu && !isClickOnToggleBtn) {
            userDropdown.classList.remove('active');
        }
    }
});

window.switchView = function(view) {
    if (!currentEmployeeName && document.getElementById('login-screen').classList.contains('active')) {
        return; 
    }
    
    currentActiveView = view;
    const themeStyle = document.getElementById('theme-style');
    const viewSkup = document.getElementById('view-skup');
    const viewExport = document.getElementById('view-export');
    const viewLoyalty = document.getElementById('view-loyalty');
    const navLogoIcon = document.getElementById('nav-logo-icon');

    if (view === 'skup') {
        if(themeStyle) themeStyle.href = `style.css?v=${APP_VERSION}`;
        if(viewSkup) viewSkup.classList.remove('hidden');
        if(viewExport) viewExport.classList.add('hidden');
        if(viewLoyalty) viewLoyalty.classList.add('hidden');
        navLogoIcon.className = 'fas fa-cash-register';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    } else if (view === 'export') {
        if(themeStyle) themeStyle.href = `style-sprzedaz.css?v=${APP_VERSION}`;
        if(viewSkup) viewSkup.classList.add('hidden');
        if(viewExport) viewExport.classList.remove('hidden');
        if(viewLoyalty) viewLoyalty.classList.add('hidden');
        navLogoIcon.className = 'fas fa-box-open';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    } else if (view === 'loyalty') {
        if(viewSkup) viewSkup.classList.add('hidden');
        if(viewExport) viewExport.classList.add('hidden');
        if(viewLoyalty) viewLoyalty.classList.remove('hidden');
        navLogoIcon.className = 'fas fa-id-card';
        document.querySelector('.navbar').classList.remove('scrolled'); 
    }
    
    document.getElementById('user-dropdown').classList.remove('active');
}

window.login = async function() {
    const pin = document.getElementById('employee-login-pin').value;
    const btn = document.getElementById('login-btn-action');
    if (!pin) return showNotice("Wprowadź PIN!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            window.mySessionStart = new Date().getTime();
            currentEmployeeName = data.name;
            currentEmployeeRank = data.rank || "Pracownik"; 
            currentEmployeeSsn = String(data.ssn) || "---"; 
            currentEmployeeDateZatrudnienia = data.dateZatrudnienia || "Brak danych";
            currentEmployeePhoto = data.photo || ""; 
            
            const adminChangelogBtn = document.getElementById('admin-changelog-btn');
            const adminReportsBtn = document.getElementById('admin-reports-btn');
            if (adminChangelogBtn) {
                if(isTravisVance()) adminChangelogBtn.classList.remove('hidden');
                else adminChangelogBtn.classList.add('hidden');
            }
            if (adminReportsBtn) {
                if(isTravisVance()) adminReportsBtn.classList.remove('hidden');
                else adminReportsBtn.classList.add('hidden');
            }

            // PAGER - Logika uprawnień po SSN
            const menuPagerBtn = document.getElementById('menu-pager');
            if (menuPagerBtn) {
                if(currentEmployeeSsn === "4") {
                    menuPagerBtn.classList.remove('hidden');
                } else {
                    menuPagerBtn.classList.add('hidden');
                }
            }

            const loyaltyBtn = document.getElementById('loyalty-floating-btn');
            if (loyaltyBtn) {
                loyaltyBtn.classList.remove('hidden');
            }

            document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
            document.getElementById('dropdown-user-name').innerText = currentEmployeeName;
            document.getElementById('dropdown-user-rank').innerText = currentEmployeeRank;
            
            const navAvatar = document.getElementById('nav-user-avatar');
            const navDefaultIcon = document.getElementById('nav-user-default-icon');
            const dropAvatar = document.getElementById('dropdown-user-avatar');
            const dropDefaultIcon = document.getElementById('dropdown-user-default-icon');

            if (currentEmployeePhoto && currentEmployeePhoto !== "") {
                navAvatar.src = currentEmployeePhoto;
                navAvatar.classList.remove('hidden');
                navDefaultIcon.classList.add('hidden');
                
                dropAvatar.src = currentEmployeePhoto;
                dropAvatar.classList.remove('hidden');
                dropDefaultIcon.classList.add('hidden');
            } else {
                navAvatar.classList.add('hidden');
                navDefaultIcon.classList.remove('hidden');
                
                dropAvatar.classList.add('hidden');
                dropDefaultIcon.classList.remove('hidden');
            }

            // --- EFEKT FACE ID (otwieranie kłódki) ---
            const mainIcon = document.querySelector('.login-icon');
            if (mainIcon) {
                mainIcon.classList.remove('fa-lock', 'fa-user-lock');
                mainIcon.classList.add('fa-unlock', 'icon-unlock-anim');
            }

            setTimeout(() => {
                const loginCard = document.querySelector('.login-card');
                loginCard.classList.add('login-zoom-in');
                
                setTimeout(() => {
                    document.getElementById('login-screen').classList.remove('active');
                    loginCard.classList.remove('login-zoom-in');
                    btn.disabled = false;
                    btn.innerHTML = 'Odblokuj system <i class="fas fa-unlock"></i>';
                    
                    const mainApp = document.getElementById('main-app');
                    mainApp.classList.remove('hidden');
                    mainApp.classList.add('app-zoom-out');
                    
                    document.getElementById('user-profile').classList.remove('hidden');
                    
                    const banner = document.getElementById('announcement-banner');
                    if(banner) banner.classList.remove('hidden');

                    window.addSystemLog('LOGOWANIE', `Pracownik zalogował się do systemu (Wersja: ${APP_VERSION}).`);

                    showNotice(`Rozpoczęto zmianę: ${data.name}`, "success");
                    
                    initSkup();
                    initExport();
                    fetchChangelogData();
                    switchView('skup');
                    checkEmployeeBonuses();

                    fetch(`${PIN_API_URL}?action=get_all`)
                        .then(res => res.json())
                        .then(d => { 
                            if(d.employees) window.currentEmployeesList = d.employees; 
                            updateOnlineEmployees(); 
                        })
                        .catch(e => console.error(e));
                    
                    onlineCheckInterval = setInterval(updateOnlineEmployees, 60000);
                    
                    setTimeout(() => { mainApp.classList.remove('app-zoom-out'); }, 600);
                }, 400);

            }, 600);

       } else {
            showNotice("Nieprawidłowy PIN!", "danger");
            window.addSystemLog('BŁĘDNY PIN', `Niewłaściwa próba autoryzacji do systemu (Użyto niepoprawnego kodu PIN w index.html).`);
            btn.disabled = false;
            btn.innerHTML = 'Odblokuj system <i class="fas fa-unlock"></i>';

            // --- EFEKT BŁĘDNEGO PINU (trzęsienie kłódki) ---
            const mainIcon = document.querySelector('.login-icon');
            if (mainIcon) {
                mainIcon.classList.add('icon-shake-anim');
                
                setTimeout(() => {
                    mainIcon.classList.remove('icon-shake-anim');
                }, 400);
            }
        }
    } catch (error) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
        console.error(error);
        btn.disabled = false;
        btn.innerHTML = 'Odblokuj system <i class="fas fa-unlock"></i>';
    }
}

window.logout = function() {
    window.addSystemLog('WYLOGOWANIE', `Pracownik zakończył zmianę i wylogował się.`);
    const mainApp = document.getElementById('main-app');
    const loginScreen = document.getElementById('login-screen');
    const loginCard = document.querySelector('.login-card');
    const mainIcon = document.querySelector('.login-icon');

    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('user-profile').classList.add('hidden');
    const banner = document.getElementById('announcement-banner');
    if(banner) banner.classList.add('hidden');

    mainApp.classList.remove('app-zoom-out');
    mainApp.classList.add('app-zoom-in');

    setTimeout(() => {
        mainApp.classList.add('hidden');
        mainApp.classList.remove('app-zoom-in');

        loginScreen.classList.add('active');
        loginCard.classList.add('login-zoom-out');

        if (mainIcon) {
            mainIcon.className = 'fas fa-unlock login-icon';
            setTimeout(() => {
                mainIcon.className = 'fas fa-lock login-icon icon-lock-anim';
                setTimeout(() => mainIcon.classList.remove('icon-lock-anim'), 500);
            }, 550);
        }

        currentEmployeeName = "";
        currentEmployeeRank = "Pracownik";
        currentEmployeeSsn = "---";
        currentEmployeeDateZatrudnienia = "---";
        currentEmployeePhoto = ""; 
        document.getElementById('employee-login-pin').value = "";
        document.getElementById('logged-user-name').innerText = "---";
        document.getElementById('dropdown-user-name').innerText = "---";
        document.getElementById('dropdown-user-rank').innerText = "---";
        
        const navAvatar = document.getElementById('nav-user-avatar');
        const navDefaultIcon = document.getElementById('nav-user-default-icon');
        const dropAvatar = document.getElementById('dropdown-user-avatar');
        const dropDefaultIcon = document.getElementById('dropdown-user-default-icon');
        
        if(navAvatar) navAvatar.classList.add('hidden');
        if(navDefaultIcon) navDefaultIcon.classList.remove('hidden');
        if(dropAvatar) dropAvatar.classList.add('hidden');
        if(dropDefaultIcon) dropDefaultIcon.classList.remove('hidden');

        const adminChangelogBtn = document.getElementById('admin-changelog-btn');
        const adminReportsBtn = document.getElementById('admin-reports-btn');
        const pagerBtn = document.getElementById('menu-pager');
        
        if(adminChangelogBtn) adminChangelogBtn.classList.add('hidden');
        if(adminReportsBtn) adminReportsBtn.classList.add('hidden');
        if(pagerBtn) pagerBtn.classList.add('hidden');

        const loyaltyBtn = document.getElementById('loyalty-floating-btn');
        if (loyaltyBtn) loyaltyBtn.classList.add('hidden');

        const clContainer = document.getElementById('dynamic-changelog-container');
        if (clContainer) clContainer.innerHTML = '';

        resetCartAndInventory();
        resetCartAndInventoryExport();
        
        clearInterval(onlineCheckInterval);
        const widget = document.getElementById('online-employees-widget');
        if (widget) widget.classList.add('hidden');

        setTimeout(() => loginCard.classList.remove('login-zoom-out'), 450);
        showNotice("Zakończono zmianę. Wylogowano.", "info");
    }, 400);
}

window.toggleUserMenu = function() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

async function checkEmployeeBonuses() {
    try {
        const res = await window.preloadBonusesData();
        const data = res;
        
        if (data.bonuses && data.bonuses.length > 0) {
            const myUnreadBonuses = data.bonuses.filter(b => b.employee === currentEmployeeName && b.status === "Nieodebrane");
            
            if (myUnreadBonuses.length > 0) {
                let totalBonus = 0;
                let detailsHtml = "";
                
                myUnreadBonuses.forEach(b => {
                    totalBonus += parseFloat(b.amount) || 0;
                    detailsHtml += `
                        <div class="bonus-detail-row">
                            <span class="bonus-detail-from">
                                <strong class="bonus-detail-boss">Od: ${b.boss}</strong><br>
                                <small>${b.reason}</small>
                            </span>
                            <strong class="bonus-detail-amount">+${window.formatMoney(b.amount)}$</strong>
                        </div>
                    `;
                });

                document.getElementById('bonus-notification-details').innerHTML = `
                    <div class="bonus-total-summary">
                        +${window.formatMoney(totalBonus)}$
                    </div>
                    <div class="bonus-list-wrapper">
                        ${detailsHtml}
                    </div>
                `;
                document.getElementById('bonus-notification-modal').classList.add('active');

                fetch(REPORTS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'mark_bonus_read',
                        employee: currentEmployeeName
                    })
                }).catch(e => console.error("Błąd oznaczania", e));
            }
        }
    } catch (e) {
        console.error("Błąd premii:", e);
    }
}

window.closeBonusNotification = function() {
    document.getElementById('bonus-notification-modal').classList.remove('active');
}

function getDailyStat(employeeName) {
    const date = getFormattedDate();
    const key = `elcartel_stats_${employeeName}_${date}`;
    return parseFloat(localStorage.getItem(key)) || 0;
}

function addDailyStat(employeeName, amount) {
    const date = getFormattedDate();
    const key = `elcartel_stats_${employeeName}_${date}`;
    const current = getDailyStat(employeeName);
    localStorage.setItem(key, current + amount);
}

function initSkup() {
    document.getElementById('header-date').innerText = getFormattedDate();
    resetCartAndInventory();
    const adInput = document.getElementById('ad-input');
    if(adInput) updateAdPreview();
    updateCartView(); 
}

function resetCartAndInventory() {
    inventory = JSON.parse(JSON.stringify(defaultInventory));
    counts = {};
    inventory.forEach((_, index) => { counts[index] = 0; });

    const finalPriceInput = document.getElementById('final-price-input');
    if (finalPriceInput) finalPriceInput.value = "";
    
    const ssnInput = document.getElementById('customer-ssn-input');
    if (ssnInput) ssnInput.value = "";
    currentCustomerSSN = "";

    renderInventory();
    calculateTotal();
}

function renderInventory() {
    const list = document.getElementById('items-list');
    if(!list) return;
    list.innerHTML = ''; 
    
    const customCards = [];
    const normalCards = [];

    inventory.forEach((item, index) => {
        if(counts[index] === undefined) counts[index] = 0;
        const card = document.createElement('div');
        let cardClass = showImagesSkup ? 'item-card show-images' : 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        
        if (item.isCustom) {
            card.className = cardClass + ' custom-card-special';
            card.innerHTML = `
                <div class="item-left-side">
                    <button onclick="removeCustomItemSlot(${index})" style="width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.15); color: var(--danger); cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; transition: 0.2s;" title="Usuń pole" onmouseover="this.style.background='var(--danger)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='var(--danger)';"><i class="fas fa-trash"></i></button>
                    <div class="item-info custom-inputs-wrapper" style="margin-right:0;">
                        <input type="text" class="custom-item-name" data-index="${index}" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}">
                        <input type="number" class="custom-item-price" data-index="${index}" placeholder="Cena $" min="0" value="${item.min > 0 ? item.min : ''}">
                    </div>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${counts[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
                </div>
            `;
            customCards.push(card);
        } else {
            card.className = cardClass;
            let imageHtml = item.image ? `<img src="${item.image}" class="item-image" alt="">` : `<i class="fas fa-box-open item-icon"></i>`;
            card.innerHTML = `
                <div class="item-left-side">
                    ${imageHtml}
                    <div class="item-info">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">${item.min === item.max ? item.min + '$' : item.min + '$ - ' + item.max + '$'}</span>
                    </div>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${counts[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
                </div>
            `;
            normalCards.push(card);
        }
    });
    
    customCards.forEach(c => list.appendChild(c));
    normalCards.forEach(c => list.appendChild(c));
    
    applyFilters();
}

window.addCustomItemSlot = function() {
    const index = inventory.length;
    inventory.push({ name: "Własny przedmiot", min: 0, max: 0, category: "inne", isCustom: true });
    counts[index] = 0;
    renderInventory();
    showNotice("Dodano nowe pole na własny przedmiot!", "success");
}

window.updateCustomName = function(index, value) {
    inventory[index].name = value || "Własny przedmiot";
    const container = document.getElementById('items-list');
    if(container) {
        const inputs = container.querySelectorAll('.custom-item-name');
        inputs.forEach(input => {
            if(parseInt(input.getAttribute('data-index')) === index) {
                const card = input.closest('.item-card');
                if(card) card.setAttribute('data-name', inventory[index].name.toLowerCase());
            }
        });
    }
    updateCartView();
}

window.updateCustomPrice = function(index, value) {
    let price = parseFloat(value) || 0;
    inventory[index].min = price;
    inventory[index].max = price;
    calculateTotal();
}

window.removeCustomItemSlot = function(index) {
    inventory.splice(index, 1);
    let newCounts = {};
    for(let i = 0; i < inventory.length; i++) {
        newCounts[i] = counts[i >= index ? i + 1 : i] || 0;
    }
    counts = newCounts;
    renderInventory();
    calculateTotal();
};

window.removeCustomItemSlotExport = function(index) {
    exportInventory.splice(index, 1);
    let newCounts = {};
    for(let i = 0; i < exportInventory.length; i++) {
        newCounts[i] = countsExport[i >= index ? i + 1 : i] || 0;
    }
    countsExport = newCounts;
    renderInventoryExport();
    calculateTotalExport();
};

window.updateCount = function(index, change) {
    counts[index] = Math.max(0, (counts[index] || 0) + change);
    const container = document.getElementById('items-list');
    if (container) {
        const input = container.querySelector(`.quantity-input[data-index="${index}"]`);
        if (input) input.value = counts[index];
    }
    calculateTotal();
    window.triggerPulseEffect('total-price', 'cart-badge');
}

window.handleInput = function(index, value) {
    counts[index] = Math.max(0, parseInt(value) || 0);
    calculateTotal();
    window.triggerPulseEffect('total-price', 'cart-badge');
}

function calculateTotal() {
    let min = 0, max = 0;
    inventory.forEach((item, index) => {
        min += item.min * (counts[index] || 0);
        max += item.max * (counts[index] || 0);
    });
    const prevMin = currentMinTotal || 0;
    currentMinTotal = min; 
    currentMaxTotal = max; 
    const totalPriceEl = document.getElementById('total-price');
    if(totalPriceEl) {
        window.animateValue(totalPriceEl, prevMin, currentMinTotal, 400);
    }
    updateCartView();
}

window.toggleCart = function() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
};

function updateCartView() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge');
    const sidebarTotal = document.getElementById('cart-sidebar-total');
    
    let totalItems = 0;
    let html = '';

    inventory.forEach((item, index) => {
        if (counts[index] > 0) {
            totalItems += counts[index];
            let itemTotalMin = item.min * counts[index];
            let itemTotalMax = item.max * counts[index];
            let priceText = item.min === item.max ? `${itemTotalMin}$` : `${itemTotalMin}$ - ${itemTotalMax}$`;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-info-col">
                        <span class="cart-item-name">${item.name}</span>
                        <div class="cart-controls">
                            <button class="cart-btn-circle minus" data-action="minus" data-index="${index}">-</button>
                            <span class="cart-item-qty">${counts[index]}</span>
                            <button class="cart-btn-circle plus" data-action="add" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${priceText}</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) html = '<div class="empty-cart-msg">Koszyk jest pusty</div>';
    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentMinTotal + '$' + (currentMaxTotal > currentMinTotal ? ` - ${currentMaxTotal}$` : '');
}

window.filterCategory = function(cat, btnElement) {
    currentCategory = cat || 'wszystkie';
    const viewSkup = document.getElementById('view-skup');
    if(viewSkup) {
        viewSkup.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if(btnElement) btnElement.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const searchInputEl = document.getElementById('search-input');
    const term = searchInputEl ? searchInputEl.value.toLowerCase() : "";
    const adSection = document.getElementById('ad-section');
    const itemsList = document.getElementById('items-list');
    const asortymentHeader = document.getElementById('asortyment-header-wrapper');

    if (currentCategory === 'reklama') {
        if(adSection) adSection.classList.remove('hidden');
        if(itemsList) itemsList.classList.add('hidden');
        if(asortymentHeader) asortymentHeader.classList.add('hidden');
    } else {
        if(adSection) adSection.classList.add('hidden');
        if(itemsList) itemsList.classList.remove('hidden');
        if(asortymentHeader) asortymentHeader.classList.remove('hidden');
        if(itemsList) {
            itemsList.querySelectorAll('.item-card').forEach(card => {
                const name = card.getAttribute('data-name') || '';
                const cat = card.getAttribute('data-category') || '';
                const match = name.includes(term) && (currentCategory === 'wszystkie' || cat === currentCategory);
                if (match) card.classList.remove('hidden');
                else card.classList.add('hidden');
            });
        }
    }
}

window.generateQuote = async function() {
    // WALIDACJA NIESTANDARDOWYCH PRODUKTÓW
    for (let i = 0; i < inventory.length; i++) {
        if (counts[i] > 0 && inventory[i].isCustom) {
            if (inventory[i].min <= 0 || inventory[i].name === "Własny przedmiot" || inventory[i].name.trim() === "") {
                return showNotice("Uzupełnij poprawną nazwę i cenę dla niestandardowych produktów!", "danger");
            }
        }
    }

    const hasItems = Object.values(counts).some(c => c > 0);
    const finalPriceInput = document.getElementById('final-price-input');
    const finalPrice = finalPriceInput ? parseFloat(finalPriceInput.value) : NaN;
    const ssnInput = document.getElementById('customer-ssn-input');
    currentCustomerSSN = ssnInput ? ssnInput.value.trim() : "";

    if (!hasItems) return showNotice("Koszyk skupu jest pusty!", "warning");
    if (isNaN(finalPrice)) return showNotice("Wpisz kwotę transakcji!", "danger");
    if (finalPrice < currentMinTotal) return showNotice(`Kwota zbyt niska! Wymagane: ${currentMinTotal}$.`, "danger");
    if (finalPrice > currentMaxTotal) return showNotice(`Kwota zbyt wysoka! Wymagane: ${currentMaxTotal}$.`, "danger");

    const btn = document.getElementById('quote-btn');
    if(!btn) return;
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie...';

    setTimeout(() => {
        try {
            finalizeQuote(currentEmployeeName || "Pracownik", finalPrice);
        } catch (error) {
            console.error("Błąd generowania paragonu:", error);
            if (window.showNotice) {
                window.showNotice("Błąd paragonu: " + error.message, "danger", 5000);
            }
        }
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }, 400);
}

function finalizeQuote(employeeName, finalPrice) {
    isStatAddedForCurrentReceipt = false;
    const receiptID = generateID();
    const currentReceiptDateEl = document.getElementById('current-receipt-date');
    if(currentReceiptDateEl) currentReceiptDateEl.innerText = getFormattedDate();
    
    const receiptIdDisplay = document.getElementById('receipt-id-display');
    if(receiptIdDisplay) receiptIdDisplay.innerText = `NR: ${receiptID}`;
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSN !== "") employeeText += `<br>KLIENT (SSN): ${currentCustomerSSN}`;
    const receiptEmployeeDisplay = document.getElementById('receipt-employee-display');
    if(receiptEmployeeDisplay) receiptEmployeeDisplay.innerHTML = employeeText;
    
    const receiptTotal = document.getElementById('receipt-total');
    if(receiptTotal) receiptTotal.innerText = finalPrice + '$';

    const itemsDiv = document.getElementById('receipt-items');
    if(itemsDiv) {
        itemsDiv.innerHTML = '';
        const ratio = finalPrice / currentMinTotal;

        inventory.forEach((item, i) => {
            if (counts[i] > 0) {
                const row = document.createElement('div');
                row.className = 'receipt-row';
                const calculatedItemTotal = Math.round(item.min * counts[i] * ratio);
                row.innerHTML = `<span>${item.name} [x${counts[i]}]</span><span>${calculatedItemTotal}$</span>`;
                itemsDiv.appendChild(row);
            }
        });

        let sigDiv = document.querySelector('.receipt-signature');
        const footerEl = document.querySelector('.receipt-footer');
        
        if (!sigDiv && footerEl && itemsDiv.parentNode) {
            sigDiv = document.createElement('div');
            sigDiv.className = 'receipt-signature';
            itemsDiv.parentNode.insertBefore(sigDiv, footerEl);
        }
        
        if (sigDiv) {
            sigDiv.innerHTML = `<span class="signature-label">Podpis pracownika</span><span class="signature-text">${employeeName}</span>`;
        }
    }

    const quoteModal = document.getElementById('quote-modal');
    if(quoteModal) quoteModal.classList.add('active');
    
    const receiptBox = document.getElementById('receipt');
    const stampBox = document.querySelector('#receipt .receipt-stamp');
    if (receiptBox && stampBox) {
        receiptBox.classList.remove('receipt-shake');
        stampBox.style.animation = 'none';
        void receiptBox.offsetWidth; // Wymuszenie reflow
        receiptBox.classList.add('receipt-shake');
        stampBox.style.animation = '';
    }
}

window.sendToDiscord = async function() {
    const btn = document.getElementById('send-discord-btn');
    const area = document.getElementById('receipt-capture-area');
    if(!area || !btn) return;
    
    // ANTI-SPAM GUARD
    if (window.isSkupProcessing) return;
    window.isSkupProcessing = true;
    
    const receiptIDDisplay = document.getElementById('receipt-id-display');
    const receiptID = receiptIDDisplay ? receiptIDDisplay.innerText.replace('NR: ', '') : '';
    const employee = currentEmployeeName; 
    const finalPriceTextEl = document.getElementById('receipt-total');
    const finalPriceText = finalPriceTextEl ? finalPriceTextEl.innerText : '0$';
    const finalPriceNumeric = parseFloat(finalPriceText.replace('$', ''));

    btn.disabled = true;
    btn.innerText = "Wysyłanie...";

    const itemsToLog = [];
    let remainingAmount = finalPriceNumeric;
    const ratio = finalPriceNumeric / currentMinTotal;
    
    const activeItems = inventory.map((item, index) => ({ item, index })).filter(x => counts[x.index] > 0);

    activeItems.forEach((x, arrayIndex) => {
        const item = x.item;
        const count = counts[x.index];
        let calculatedTotal;
        if (arrayIndex === activeItems.length - 1) calculatedTotal = remainingAmount;
        else {
            calculatedTotal = Math.round(item.min * count * ratio);
            remainingAmount -= calculatedTotal;
        }
        itemsToLog.push({ name: item.name, qty: count, total: calculatedTotal });
    });

    const logPayload = {
        action: "save_receipt",
        type: "skup",
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: receiptID, 
        items: itemsToLog,
        ssn: currentCustomerSSN 
    };

    try {
        const canvas = await html2canvas(area, { 
            scale: 2, 
            backgroundColor: "#ffffff", 
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedArea = clonedDoc.getElementById('receipt-capture-area');
                if (clonedArea) {
                    const receiptEl = clonedArea.querySelector('.receipt');
                    const stampEl = clonedArea.querySelector('.receipt-stamp');
                    if (receiptEl) {
                        receiptEl.style.setProperty('animation', 'none', 'important');
                        receiptEl.style.setProperty('transform', 'translate(0, 0)', 'important');
                    }
                    if (stampEl) {
                        stampEl.style.setProperty('animation', 'none', 'important');
                        stampEl.style.setProperty('transform', 'scale(1) rotate(-15deg)', 'important');
                        stampEl.style.setProperty('opacity', '0.8', 'important');
                    }
                }
            }
        });

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "paragon.png");
            
            let employeeFieldValue = `**${employee}**`;
            if (currentCustomerSSN !== "") employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSN}**)`;

            const embedPayload = {
                embeds: [{
                    title: "📑 Wystawiono nowy paragon!",
                    color: 36991, 
                    fields: [
                        { name: "📋 Numer paragonu:", value: `\`${receiptID}\``, inline: true },
                        { name: "👤 Pracownik:", value: employeeFieldValue, inline: true },
                        { name: "💰 Suma:", value: `**${finalPriceText}**`, inline: false }
                    ],
                    image: { url: "attachment://paragon.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System EL CARTEL PAWN SHOP" }
                }]
            };

            formData.append("payload_json", JSON.stringify(embedPayload));
            
            const res = await fetch(DISCORD_WEBHOOK_URL_SKUP, { method: "POST", body: formData });
            if (res.ok) {
                fetch(REPORTS_API_URL, { method: "POST", body: JSON.stringify(logPayload) }).catch(e => console.error(e));
                if (!isStatAddedForCurrentReceipt) {
                    addDailyStat(currentEmployeeName, finalPriceNumeric);
                    isStatAddedForCurrentReceipt = true;
                }
                showNotice("Wysłano na Discord i zaktualizowano obrót!", "success");

                window.addSystemLog('SKUP', `Wystawiono paragon [${receiptID}] na kwotę: ${finalPriceNumeric}$`);

                resetCartAndInventory();
                closeModal();
                
                // Inwalidacja cache po dodaniu nowego wpisu
                window.reportsFetchPromise = null;
                window.bonusesFetchPromise = null;
                window.errorReportsFetchPromise = null;
                updateOnlineEmployees(); 
            } else throw new Error();
        }, "image/png");
    } catch (e) {
        showNotice("Błąd Webhooka!", "danger");
    } finally {
        // VISUAL COOLDOWN ANTYSZPAMOWY (2 SEKUNDY)
        let cooldownTime = 2;
        btn.innerHTML = `<i class="fas fa-lock"></i> Cooldown (${cooldownTime}s)`;
        const interval = setInterval(() => {
            cooldownTime--;
            if (cooldownTime <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij na Discord';
                window.isSkupProcessing = false;
            } else {
                btn.innerHTML = `<i class="fas fa-lock"></i> Cooldown (${cooldownTime}s)`;
            }
        }, 1000);
    }
}

window.copyReceiptToClipboard = async function() {
    const btn = document.getElementById('copy-receipt-btn');
    const area = document.getElementById('receipt-capture-area');
    if(!area || !btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';

    try {
        const canvas = await html2canvas(area, { 
            scale: 2, 
            backgroundColor: "#ffffff", 
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedArea = clonedDoc.getElementById('receipt-capture-area');
                if (clonedArea) {
                    const receiptEl = clonedArea.querySelector('.receipt');
                    const stampEl = clonedArea.querySelector('.receipt-stamp');
                    if (receiptEl) {
                        receiptEl.style.setProperty('animation', 'none', 'important');
                        receiptEl.style.setProperty('transform', 'translate(0, 0)', 'important');
                    }
                    if (stampEl) {
                        stampEl.style.setProperty('animation', 'none', 'important');
                        stampEl.style.setProperty('transform', 'scale(1) rotate(-15deg)', 'important');
                        stampEl.style.setProperty('opacity', '0.8', 'important');
                    }
                }
            }
        });

        canvas.toBlob(async (blob) => {
            try {
                const data = [new ClipboardItem({ [blob.type]: blob })];
                await navigator.clipboard.write(data);
                showNotice("Skopiowano paragon do schowka!", "success");
            } catch (err) {
                showNotice("Błąd kopiowania! Spróbuj innej przeglądarki.", "danger");
            }
        });
    } catch (e) {
        showNotice("Błąd generowania obrazu!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-copy"></i> Wydaj paragon klientowi';
    }
}

window.updateAdPreview = function() {
    const input = document.getElementById('ad-input');
    if(!input) return;
    const preview = document.getElementById('ad-preview');
    const colors = {'~r~':'#ff4444','~g~':'#33ff33','~b~':'#3399ff','~y~':'#ffff33','~p~':'#cc66ff','~o~':'#ff9933','~w~':'#fff','~s~':'#fff'};
    let html = "", style = "color:#fff", bold = false;
    
    input.value.split(/(~[a-z]~)/g).forEach(p => {
        if (p === '~h~') bold = !bold;
        else if (colors[p]) style = `color:${colors[p]}`;
        else html += `<span style="${style};font-weight:${bold?900:400}">${p}</span>`;
    });
    if(preview) preview.innerHTML = html;
}

window.insertTag = function(tag) {
    const area = document.getElementById('ad-input');
    if(!area) return;
    const s = area.selectionStart, e = area.selectionEnd;
    area.value = area.value.substring(0, s) + tag + area.value.substring(e);
    updateAdPreview();
}

window.copyAd = function() {
    const adInput = document.getElementById('ad-input');
    if(adInput) {
        navigator.clipboard.writeText(adInput.value);
        showNotice("Skopiowano reklamę!", "success");
    }
}

window.closeModal = function() { 
    const quoteModal = document.getElementById('quote-modal');
    if(quoteModal) quoteModal.classList.remove('active'); 
}

window.toggleSummary = function() {
    const bar = document.getElementById('summary-bar');
    const icon = document.getElementById('toggle-icon');
    if (bar && icon) {
        bar.classList.toggle('open');
        if (bar.classList.contains('open')) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        else icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

function initExport() {
    const list = document.getElementById('items-list-export');
    if (!list) return;
    list.innerHTML = '';
    const headerDateExport = document.getElementById('header-date-export');
    if(headerDateExport) headerDateExport.innerText = getFormattedDate();
    resetCartAndInventoryExport();
}

function resetCartAndInventoryExport() {
    exportInventory = JSON.parse(JSON.stringify(defaultExportInventory));
    countsExport = {};
    exportInventory.forEach((_, index) => { countsExport[index] = 0; });
    const ssnInput = document.getElementById('customer-ssn-input-export');
    if (ssnInput) ssnInput.value = "";
    currentCustomerSSNExport = "";
    renderInventoryExport();
    calculateTotalExport();
}

function renderInventoryExport() {
    const list = document.getElementById('items-list-export');
    if(!list) return;
    list.innerHTML = ''; 
    
    const customCards = [];
    const normalCards = [];

    exportInventory.forEach((item, index) => {
        if(countsExport[index] === undefined) countsExport[index] = 0;
        const card = document.createElement('div');
        let cardClass = showImagesExport ? 'item-card show-images' : 'item-card';
        card.setAttribute('data-category', item.category);
        card.setAttribute('data-name', item.name.toLowerCase());
        
        if(item.isCustom) {
            card.className = cardClass + ' custom-item';
            card.id = `custom-card-export-${index}`;
            card.innerHTML = `
                <div class="item-left-side">
                    <button onclick="removeCustomItemSlotExport(${index})" style="width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.15); color: var(--danger); cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; transition: 0.2s;" title="Usuń pole" onmouseover="this.style.background='var(--danger)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='var(--danger)';"><i class="fas fa-trash"></i></button>
                    <div class="custom-inputs-wrapper" style="margin-right: 0;">
                        <input type="text" class="custom-name-input" data-index="${index}" placeholder="Wpisz nazwę..." value="${item.name === 'Własny przedmiot' ? '' : item.name}">
                        <input type="number" class="custom-price-input" data-index="${index}" placeholder="Cena $" min="0" value="${item.price > 0 ? item.price : ''}">
                    </div>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${countsExport[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
                </div>
            `;
            customCards.push(card);
        } else {
            card.className = cardClass;
            let imageHtml = item.image ? `<img src="${item.image}" class="item-image" alt="">` : `<i class="fas fa-box-open item-icon"></i>`;
            card.innerHTML = `
                <div class="item-left-side">
                    ${imageHtml}
                    <div class="item-info">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">Sprzedaż: ${item.price}$</span>
                    </div>
                </div>
                <div class="controls">
                    <button class="btn-circle minus" data-action="minus" data-index="${index}">-</button>
                    <input type="number" class="quantity-input" data-index="${index}" value="${countsExport[index]}" min="0">
                    <button class="btn-circle plus" data-action="add" data-index="${index}">+</button>
                </div>
            `;
            normalCards.push(card);
        }
    });
    
    customCards.forEach(c => list.appendChild(c));
    normalCards.forEach(c => list.appendChild(c));
    
    applyFiltersExport();
}

window.addCustomItemSlotExport = function() {
    const index = exportInventory.length; 
    exportInventory.push({ name: "Własny przedmiot", price: 0, category: "custom", isCustom: true });
    countsExport[index] = 0;
    renderInventoryExport();
    calculateTotalExport();
    showNotice("Dodano nowe pole na własny przedmiot!", "success");
}

window.updateCustomNameExport = function(i, val) {
    exportInventory[i].name = val || "Własny przedmiot";
    updateCartViewExport();
}

window.updateCustomPriceExport = function(i, val) {
    exportInventory[i].price = parseInt(val) || 0;
    calculateTotalExport();
}

window.updateCountExport = function(index, change) {
    countsExport[index] = Math.max(0, (countsExport[index] || 0) + change);
    const container = document.getElementById('items-list-export');
    if (container) {
        const input = container.querySelector(`.quantity-input[data-index="${index}"]`);
        if (input) input.value = countsExport[index];
    }
    calculateTotalExport();
    window.triggerPulseEffect('total-price-export', 'cart-badge-export');
}

window.handleInputExport = function(i, value) {
    countsExport[i] = Math.max(0, parseInt(value) || 0);
    calculateTotalExport();
    window.triggerPulseEffect('total-price-export', 'cart-badge-export');
}

function calculateTotalExport() {
    const prevTotal = currentTotalExport || 0;
    currentTotalExport = exportInventory.reduce((sum, item, i) => sum + (item.price * (countsExport[i] || 0)), 0);
    const totalDisplay = document.getElementById('total-price-export');
    if (totalDisplay) {
        window.animateValue(totalDisplay, prevTotal, currentTotalExport, 400);
    }
    updateCartViewExport();
}

window.toggleCartExport = function() {
    const sidebar = document.getElementById('cart-sidebar-export');
    if (sidebar) sidebar.classList.toggle('active');
};

window.updateCartViewExport = function() {
    const container = document.getElementById('cart-items-container-export');
    const badge = document.getElementById('cart-badge-export');
    const sidebarTotal = document.getElementById('cart-sidebar-total-export');
    
    let totalItems = 0;
    let html = '';

    exportInventory.forEach((item, index) => {
        if (countsExport[index] > 0) {
            totalItems += countsExport[index];
            let itemTotal = item.price * countsExport[index];
            let displayName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-info-col">
                        <span class="cart-item-name">${displayName}</span>
                        <div class="cart-controls">
                            <button class="cart-btn-circle minus" data-action="minus" data-index="${index}">-</button>
                            <span class="cart-item-qty">${countsExport[index]}</span>
                            <button class="cart-btn-circle plus" data-action="add" data-index="${index}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">${itemTotal}$</div>
                </div>
            `;
        }
    });

    if (totalItems === 0) html = '<div class="empty-cart-msg">Brak przedmiotów</div>';
    if (container) container.innerHTML = html;
    if (badge) badge.innerText = totalItems;
    if (sidebarTotal) sidebarTotal.innerText = currentTotalExport + '$';
};

window.filterCategoryExport = function(cat, btnElement) {
    currentCategoryExport = cat || 'wszystkie';
    const viewExport = document.getElementById('view-export');
    if(viewExport) {
        viewExport.querySelectorAll('.categories-container .cat-btn').forEach(b => b.classList.remove('active'));
    }
    if (btnElement) btnElement.classList.add('active');
    applyFiltersExport();
}

function applyFiltersExport() {
    const searchInputExportEl = document.getElementById('search-input-export');
    const term = searchInputExportEl ? searchInputExportEl.value.toLowerCase() : "";
    const viewExport = document.getElementById('view-export');
    if(viewExport) {
        viewExport.querySelectorAll('.item-card:not(.custom-item)').forEach(card => {
            const dataName = card.getAttribute('data-name');
            if(dataName) {
                const match = dataName.includes(term) && (currentCategoryExport === 'wszystkie' || card.getAttribute('data-category') === currentCategoryExport);
                if(match) card.classList.remove('hidden');
                else card.classList.add('hidden');
            }
        });
    }
}

window.generateQuoteExport = async function() {
    // WALIDACJA NIESTANDARDOWYCH PRODUKTÓW
    for (let i = 0; i < exportInventory.length; i++) {
        if (countsExport[i] > 0 && exportInventory[i].isCustom) {
            if (exportInventory[i].price <= 0 || exportInventory[i].name === "Własny przedmiot" || exportInventory[i].name.trim() === "") {
                return showNotice("Uzupełnij poprawną nazwę i cenę (>0$) dla niestandardowych produktów!", "danger");
            }
        }
    }

    if (!Object.values(countsExport).some(c => c > 0)) return showNotice("Koszyk eksportu jest pusty!", "warning");
    
    const ssnInput = document.getElementById('customer-ssn-input-export');
    currentCustomerSSNExport = ssnInput ? ssnInput.value.trim() : "";

    const btn = document.getElementById('quote-btn-export');
    if(!btn) return;
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Przetwarzanie...';

    setTimeout(() => {
        finalizeQuoteExport(currentEmployeeName);
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }, 400);
}

window.finalizeQuoteExport = function(employeeName) {
    lastGeneratedReportID = `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const date = getFormattedDate();
    
    let employeeText = `PRACOWNIK: ${employeeName.toUpperCase()}`;
    if (currentCustomerSSNExport !== "") employeeText += `<br>KLIENT (SSN): ${currentCustomerSSNExport}`;

    const receiptHTML = `
        <div class="receipt receipt-shake">
            <div class="receipt-header">
                <h2>EL CARTEL EXPORT</h2>
                <p class="receipt-meta">Raport sprzedaży przedmiotów</p>
                <p class="receipt-meta">NR: ${lastGeneratedReportID}</p>
                <p class="receipt-meta">${employeeText}</p>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items-list">
                ${exportInventory.map((item, i) => {
                    if (countsExport[i] > 0) {
                        let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
                        return `
                        <div class="receipt-row">
                            <span>${dName} x${countsExport[i]}</span>
                            <span>${item.price * countsExport[i]}$</span>
                        </div>
                        `;
                    }
                    return '';
                }).join('')}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-row total">
                <span>RAZEM:</span>
                <span>${currentTotalExport}$</span>
            </div>
            <p class="receipt-meta mt-15">Data wystawienia: ${date}</p>
            <div class="receipt-stamp">SPRZEDANO</div>
        </div>
    `;

    const preview = document.getElementById('receipt-preview-container-export');
    const capture = document.getElementById('receipt-capture-area-export');

    if (preview && capture) {
        preview.innerHTML = receiptHTML;
        capture.innerHTML = receiptHTML;
        const quoteModalExport = document.getElementById('quote-modal-export');
        if(quoteModalExport) quoteModalExport.classList.add('active');
    }
}

window.sendToDiscordExport = async function() {
    const btn = document.getElementById('send-discord-btn-export');
    const area = document.getElementById('receipt-capture-area-export');
    if (!area || !btn) return;

    // ANTI-SPAM GUARD EXPORT
    if (window.isExportProcessing) return;
    window.isExportProcessing = true;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PRZETWARZANIE...';

    const itemsToLog = [];
    exportInventory.forEach((item, i) => {
        if (countsExport[i] > 0) {
            let dName = item.isCustom ? (item.name || "Własny przedmiot") : item.name;
            itemsToLog.push({ name: dName, qty: countsExport[i], total: item.price * countsExport[i] });
        }
    });

    const logPayload = {
        action: "save_receipt",
        type: "sprzedaz", 
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: lastGeneratedReportID,
        items: itemsToLog,
        ssn: currentCustomerSSNExport 
    };

    try {
        const canvas = await html2canvas(area, { 
            scale: 3, 
            backgroundColor: "#ffffff", 
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedArea = clonedDoc.getElementById('receipt-capture-area-export');
                if (clonedArea) {
                    const receiptEl = clonedArea.querySelector('.receipt');
                    const stampEl = clonedArea.querySelector('.receipt-stamp');
                    if (receiptEl) {
                        receiptEl.style.setProperty('animation', 'none', 'important');
                        receiptEl.style.setProperty('transform', 'translate(0, 0)', 'important');
                    }
                    if (stampEl) {
                        stampEl.style.setProperty('animation', 'none', 'important');
                        stampEl.style.setProperty('transform', 'scale(1) rotate(-15deg)', 'important');
                        stampEl.style.setProperty('opacity', '0.8', 'important');
                    }
                }
            }
        });

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "raport.png");
            
            let employeeFieldValue = `\`${currentEmployeeName}\``;
            if (currentCustomerSSNExport !== "") employeeFieldValue += `\n(Klient SSN: **${currentCustomerSSNExport}**)`;

            const embedPayload = {
                embeds: [{
                    title: "🚛 NOWY RAPORT SPRZEDAŻY",
                    color: 15995922,
                    fields: [
                        { name: "👤 Pracownik:", value: employeeFieldValue, inline: true },
                        { name: "📋 Nr raportu:", value: `\`${lastGeneratedReportID}\``, inline: true },
                        { name: "💰 Suma:", value: `\`${currentTotalExport}$\``, inline: false }
                    ],
                    image: { url: "attachment://raport.png" },
                    timestamp: new Date().toISOString(),
                    footer: { text: "System EL CARTEL EXPORT" }
                }]
            };

            formData.append("payload_json", JSON.stringify(embedPayload));

            const res = await fetch(DISCORD_WEBHOOK_URL_EXPORT, { method: "POST", body: formData });
            if (res.ok) {
                fetch(REPORTS_API_URL, { method: "POST", body: JSON.stringify(logPayload) }).catch(e => console.error(e));
                showNotice("Wysłano raport na Discord!", "success");

                window.addSystemLog('SPRZEDAŻ', `Zrealizowano sprzedaż [${lastGeneratedReportID}] na kwotę: ${currentTotalExport}$`);

                closeModalExport();
                resetCartAndInventoryExport();
                
                // Inwalidacja cache po dodaniu nowego wpisu
                window.reportsFetchPromise = null;
                window.bonusesFetchPromise = null;
                window.errorReportsFetchPromise = null;
                updateOnlineEmployees(); 
            } else {
                showNotice("Błąd Webhooka!", "danger");
            }
        }, "image/png");
    } catch (e) {
        showNotice("Błąd generatora obrazu!", "danger");
    } finally {
        // VISUAL COOLDOWN ANTYSZPAMOWY EXPORT (2 SEKUNDY)
        let cooldownTime = 2;
        btn.innerHTML = `<i class="fas fa-lock"></i> Cooldown (${cooldownTime}s)`;
        const interval = setInterval(() => {
            cooldownTime--;
            if (cooldownTime <= 0) {
                clearInterval(interval);
                btn.disabled = false;
                btn.innerHTML = '<i class="fab fa-discord"></i> Wyślij raport na Discord';
                window.isExportProcessing = false;
            } else {
                btn.innerHTML = `<i class="fas fa-lock"></i> Cooldown (${cooldownTime}s)`;
            }
        }, 1000);
    }
}

window.closeModalExport = () => {
    const quoteModalExport = document.getElementById('quote-modal-export');
    if(quoteModalExport) quoteModalExport.classList.remove('active');
}

window.toggleSummaryExport = function() {
    const bar = document.getElementById('summary-bar-export');
    const icon = document.getElementById('toggle-icon-export');
    if (bar && icon) {
        bar.classList.toggle('open');
        if (bar.classList.contains('open')) icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        else icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

async function fetchChangelogData() {
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        const clData = data.filter(r => r.type === "changelog");
        
        if (clData.length > 0) {
            const grouped = {};
            clData.forEach(r => {
                if (!grouped[r.report_id]) grouped[r.report_id] = { date: r.date, items: [] };
                grouped[r.report_id].items.push(r.name);
            });
            
            const sortedVersions = Object.keys(grouped).reverse();
            const container = document.getElementById('dynamic-changelog-container');
            if(container && sortedVersions.length > 0) {
                LATEST_CHANGELOG_VERSION = sortedVersions[0]; 
                container.innerHTML = ""; 
                
                sortedVersions.forEach((v, index) => {
                    let displayDate = grouped[v].date;
                    const d = parseDate(grouped[v].date);
                    if (d && !isNaN(d.getTime())) {
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        displayDate = `${day}.${month}.${year} ${hours}:${minutes}`;
                    }
                    
                    const dateLabel = index === 0 ? "Najnowsza" : displayDate;
                    let listHtml = "";
                    let displayVersion = v.startsWith('v') ? v.substring(1) : v;
                    
                    grouped[v].items.forEach(itemStr => {
                        let tag = "INFO", desc = itemStr;
                        if(itemStr.includes('|||')) {
                            const parts = itemStr.split('|||');
                            tag = parts[0]; desc = parts[1];
                        }
                        let clClass = "cl-tag";
                        if (tag === "NOWOŚĆ") clClass = "cl-new";
                        else if (tag === "POPRAWKA") clClass = "cl-fix";
                        else if (tag === "USUNIĘTO") clClass = "cl-del";
                        listHtml += `<li><span class="cl-tag ${clClass}">${tag}</span> ${desc}</li>`;
                    });

                    let adminControls = "";
                    if (isTravisVance()) {
                        const safeItems = encodeURIComponent(JSON.stringify(grouped[v].items));
                        adminControls = `
                            <div class="admin-controls-layout">
                                <button class="btn-admin-edit" data-action="edit-cl" data-version="${v}" data-items="${safeItems}"><i class="fas fa-edit"></i></button>
                                <button class="btn-admin-del" data-action="delete-cl" data-version="${v}"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    }
                    
                    container.innerHTML += `
                        <div class="changelog-item">
                            <div class="changelog-version-header">
                                Wersja ${displayVersion} <span class="changelog-date">${dateLabel}</span>
                                ${adminControls}
                            </div>
                            <ul class="changelog-list">${listHtml}</ul>
                        </div>
                    `;
                });
                checkChangelogNotification();
            }
        }
    } catch(e) { console.log(e); checkChangelogNotification(); }
}

function checkChangelogNotification() {
    const seenVersion = localStorage.getItem('elcartel_changelog_seen');
    const navDot = document.getElementById('nav-notification-dot');
    const dropDot = document.getElementById('dropdown-notification-dot');
    if (seenVersion !== LATEST_CHANGELOG_VERSION) {
        if (navDot) navDot.classList.remove('hidden');
        if (dropDot) dropDot.classList.remove('hidden');
    } else {
        if (navDot) navDot.classList.add('hidden');
        if (dropDot) dropDot.classList.add('hidden');
    }
}

window.openChangelog = function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('changelog-modal').classList.add('active');
    localStorage.setItem('elcartel_changelog_seen', LATEST_CHANGELOG_VERSION);
    checkChangelogNotification(); 
}

window.closeChangelog = function() { document.getElementById('changelog-modal').classList.remove('active'); }

window.openAdminChangelog = function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-changelog-modal').classList.add('active');
    if(document.getElementById('admin-changes-list').children.length === 0) addAdminChangeSlot();
}

window.closeAdminChangelog = function() { document.getElementById('admin-changelog-modal').classList.remove('active'); }

window.addAdminChangeSlot = function() {
    if (!isTravisVance()) return;
    const container = document.getElementById('admin-changes-list');
    const div = document.createElement('div');
    div.className = "admin-change-slot-layout";
    div.innerHTML = `
        <select class="custom-input admin-change-tag admin-change-select"><option value="NOWOŚĆ">NOWOŚĆ</option><option value="POPRAWKA">POPRAWKA</option><option value="USUNIĘTO">USUNIĘTO</option></select>
        <input type="text" class="custom-input admin-change-desc admin-change-input" placeholder="Opis zmiany...">
        <button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
}

window.publishChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    const version = document.getElementById('admin-version-input').value.trim();
    if (!version) return showNotice("Podaj numer wersji!", "warning");
    const rows = document.querySelectorAll('#admin-changes-list > div');
    if (rows.length === 0) return showNotice("Dodaj co najmniej jedną zmianę!", "warning");
    
    let itemsToLog = [], valid = true;
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if (!desc) valid = false;
        itemsToLog.push({ name: `${tag}|||${desc}`, qty: 1, total: 0 });
    });
    
    if (!valid) return showNotice("Wypełnij opisy!", "warning");
    const btn = document.getElementById('publish-changelog-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    try {
        await fetch(REPORTS_API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "save_receipt", type: "changelog", date: getFormattedDateTime(), employee: currentEmployeeName, report_id: "v" + version, items: itemsToLog })
        });
        showNotice("Changelog opublikowany!", "success");
        window.addSystemLog('CHANGELOG', `Opublikowano nową wersję systemu: v${version}`);
        closeAdminChangelog();
        document.getElementById('admin-version-input').value = "";
        document.getElementById('admin-changes-list').innerHTML = "";
        fetchChangelogData(); 
    } catch(e) { showNotice("Błąd publikacji!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openEditChangelog = function(version, itemsJson) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('changelog-modal').classList.remove('active'); 
    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('edit-cl-original-version').value = version;
    document.getElementById('edit-cl-version-input').value = version.startsWith('v') ? version.substring(1) : version;
    
    const container = document.getElementById('edit-cl-changes-list');
    container.innerHTML = "";
    items.forEach(itemStr => {
        let tag = "INFO", desc = itemStr;
        if(itemStr.includes('|||')) { const parts = itemStr.split('|||'); tag = parts[0]; desc = parts[1]; }
        const div = document.createElement('div');
        div.className = "admin-change-slot-layout";
        div.innerHTML = `
            <select class="custom-input admin-change-tag admin-change-select">
                <option value="NOWOŚĆ" ${tag==='NOWOŚĆ'?'selected':''}>NOWOŚĆ</option>
                <option value="POPRAWKA" ${tag==='POPRAWKA'?'selected':''}>POPRAWKA</option>
                <option value="USUNIĘTO" ${tag==='USUNIĘTO'?'selected':''}>USUNIĘTO</option>
            </select>
            <input type="text" class="custom-input admin-change-desc admin-change-input" value="${desc.replace(/"/g, '&quot;')}">
            <button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
    document.getElementById('edit-changelog-modal').classList.add('active');
}

window.closeEditChangelog = function() {
    document.getElementById('edit-changelog-modal').classList.remove('active');
    document.getElementById('changelog-modal').classList.add('active'); 
}

window.addEditChangeSlot = function() {
    if (!isTravisVance()) return;
    const container = document.getElementById('edit-cl-changes-list');
    const div = document.createElement('div');
    div.className = "admin-change-slot-layout";
    div.innerHTML = `<select class="custom-input admin-change-tag admin-change-select"><option value="NOWOŚĆ">NOWOŚĆ</option><option value="POPRAWKA">POPRAWKA</option><option value="USUNIĘTO">USUNIĘTO</option></select><input type="text" class="custom-input admin-change-desc admin-change-input" placeholder="Opis zmiany..."><button type="button" class="settings-close-btn btn-delete-slot" data-action="remove-slot"><i class="fas fa-trash"></i></button>`;
    container.appendChild(div);
}

window.saveEditedChangelog = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    const origVersion = document.getElementById('edit-cl-original-version').value;
    const newVersion = document.getElementById('edit-cl-version-input').value.trim();
    if(!newVersion) return showNotice("Podaj numer wersji!", "warning");
    
    const rows = document.querySelectorAll('#edit-cl-changes-list > div');
    if(rows.length === 0) return showNotice("Podaj chociaż jedną zmianę!", "warning");
    
    let itemsToLog = [], valid = true;
    rows.forEach(row => {
        const tag = row.querySelector('.admin-change-tag').value;
        const desc = row.querySelector('.admin-change-desc').value.trim();
        if(!desc) valid = false;
        itemsToLog.push({ name: `${tag}|||${desc}`, qty: 1, total: 0 });
    });
    
    if(!valid) return showNotice("Wypełnij opisy!", "warning");
    const btn = document.getElementById('save-edit-cl-btn');
    const origHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
    
    try {
        await fetch(REPORTS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'edit_changelog', original_version: origVersion, new_version: newVersion.startsWith('v') ? newVersion : 'v' + newVersion, items: itemsToLog, employee: currentEmployeeName, date: getFormattedDateTime() })
        });
        showNotice("Zaktualizowano changelog!", "success");
        window.addSystemLog('CHANGELOG', `Zaktualizowano wpis changeloga dla wersji: ${newVersion}`);
        closeEditChangelog();
        fetchChangelogData();
    } catch(e) { showNotice("Błąd edycji!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = origHtml; }
}

window.deleteChangelog = async function(version) {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    if(!confirm("Na pewno usunąć: " + version + "?")) return;
    try {
        await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete_changelog', version: version }) });
        showNotice("Usunięto " + version + "!", "success");
        window.addSystemLog('CHANGELOG', `Usunięto wpis changeloga: ${version}`);
        fetchChangelogData(); 
    } catch(e) { showNotice("Błąd usuwania!", "danger"); }
}

window.openSettings = function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('settings-modal').classList.add('active');
}

window.closeSettings = function() {
    document.getElementById('settings-modal').classList.remove('active');
    document.getElementById('old-pin-input').value = '';
    document.getElementById('new-pin-input').value = '';
    document.getElementById('new-pin-confirm').value = '';
}

window.changeEmployeePin = async function() {
    const oldPin = document.getElementById('old-pin-input').value;
    const newPin = document.getElementById('new-pin-input').value;
    const confirmPin = document.getElementById('new-pin-confirm').value;

    if (!oldPin || !newPin || !confirmPin) return showNotice("Wypełnij wszystkie pola!", "warning");
    if (newPin !== confirmPin) return showNotice("Nowe kody PIN nie są identyczne!", "danger");
    if (newPin.length < 4) return showNotice("Nowy PIN musi mieć dokładnie 4 cyfry!", "warning");
    if (oldPin === newPin) return showNotice("Nowy PIN musi różnić się od starego!", "warning");

    const btn = document.getElementById('change-pin-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        const response = await fetch(PIN_API_URL, { method: 'POST', body: JSON.stringify({ action: 'change_pin', old_pin: oldPin, new_pin: newPin, name: currentEmployeeName }) });
        const data = await response.json();
        if (data.success) { 
            showNotice("PIN zmieniony!", "success"); 
            window.addSystemLog('USTAWIENIA', 'Pracownik zmienił swój kod PIN.');
            closeSettings(); 
        } 
        else { showNotice(data.message || "Błąd zmiany PINu!", "danger"); }
    } catch (e) { showNotice("Błąd połączenia!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openMyStats = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-stats-modal').classList.add('active');
    document.getElementById('my-stats-loader').classList.remove('hidden');
    document.getElementById('my-stats-content').classList.add('hidden');
    
    try {
        const data = await window.preloadReportsData();
        myStatsRawData = data.filter(row => row.employee === currentEmployeeName);
        document.getElementById('my-stats-time-filter').value = 'today';
        currentStatsType = currentActiveView === 'export' ? 'sprzedaz' : 'skup';
        currentStatsRange = 'today';
        document.getElementById('btn-stats-skup').classList.toggle('active', currentStatsType === 'skup');
        document.getElementById('btn-stats-sprzedaz').classList.toggle('active', currentStatsType === 'sprzedaz');
        renderMyStatsDisplay();
        document.getElementById('my-stats-loader').classList.add('hidden');
        document.getElementById('my-stats-content').classList.remove('hidden');
    } catch (err) {
        document.getElementById('my-stats-loader').innerHTML = '<p class="text-danger-icon"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchStatsView = function(type) {
    currentStatsType = type;
    document.getElementById('btn-stats-skup').classList.toggle('active', type === 'skup');
    document.getElementById('btn-stats-sprzedaz').classList.toggle('active', type === 'sprzedaz');
    renderMyStatsDisplay();
}

window.changeStatsTimeRange = function(range) {
    currentStatsRange = range;
    renderMyStatsDisplay();
}

window.renderMyStatsDisplay = function() {
    const typeData = myStatsRawData.filter(row => row.employee === currentEmployeeName && row.type === currentStatsType);
    let periodTotal = 0, allTimeTotal = 0, txSet = new Set(), itemCounts = {}, periodItemsQty = 0;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOf7Days = startOfToday - (6 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    typeData.forEach(row => {
        allTimeTotal += row.total; 
        let rowTime = 0;
        const d = parseDate(row.date);
        if(d) rowTime = d.getTime();

        let isInRange = false;
        if (currentStatsRange === 'all') isInRange = true;
        else if (currentStatsRange === 'today') { if (rowTime >= startOfToday) isInRange = true; } 
        else if (currentStatsRange === 'yesterday') { if (rowTime >= startOfYesterday && rowTime < startOfToday) isInRange = true; } 
        else if (currentStatsRange === '7days') { if (rowTime >= startOf7Days) isInRange = true; } 
        else if (currentStatsRange === 'month') { if (rowTime >= startOfMonth) isInRange = true; }
        
        if (isInRange) {
            periodTotal += row.total;
            periodItemsQty += row.qty;
            if (row.report_id) txSet.add(row.report_id);
            if (!itemCounts[row.name]) itemCounts[row.name] = 0;
            itemCounts[row.name] += row.qty;
        }
    });

    let displayPeriodTotal = periodTotal;
    if (currentStatsRange === 'today' && currentStatsType === 'skup') {
        displayPeriodTotal = Math.max(periodTotal, getDailyStat(currentEmployeeName)); 
    }
    
    let topItem = "Brak", maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
        if (qty > maxQty) { maxQty = qty; topItem = name; }
    }

    let txCount = txSet.size;
    if (txCount === 0 && displayPeriodTotal > 0) txCount = Object.keys(itemCounts).length > 0 ? 1 : 0; 
    let avgTx = txCount > 0 ? Math.round(displayPeriodTotal / txCount) : 0;
    
    document.getElementById('ms-today').innerText = displayPeriodTotal + '$';
    document.getElementById('ms-alltime').innerText = allTimeTotal + '$';
    document.getElementById('ms-count').innerText = txCount;
    document.getElementById('ms-avg').innerText = avgTx + '$';
    document.getElementById('ms-items').innerText = periodItemsQty;
    document.getElementById('ms-topitem').innerText = topItem.length > 15 ? topItem.substring(0, 15) + '...' : topItem;
    const labelEl = document.getElementById('ms-label-items');
    if(labelEl) labelEl.innerText = currentStatsType === 'skup' ? 'Skupione sztuki' : 'Sprzedane sztuki';
    const descEl = document.getElementById('my-stats-desc');
    if (descEl) descEl.innerText = currentStatsType === 'skup' ? 'Podsumowanie Twojej aktywności w firmie (skup).' : 'Podsumowanie Twojej aktywności w firmie (sprzedaż).';
    const periodLabelEl = document.getElementById('ms-label-period');
    if (periodLabelEl) {
        if (currentStatsRange === 'today') periodLabelEl.innerText = 'Dzisiejszy obrót';
        else if (currentStatsRange === 'yesterday') periodLabelEl.innerText = 'Wczorajszy obrót';
        else if (currentStatsRange === '7days') periodLabelEl.innerText = 'Obrót (7 dni)';
        else if (currentStatsRange === 'month') periodLabelEl.innerText = 'Obrót (Miesiąc)';
        else periodLabelEl.innerText = 'Obrót (Całkowity)';
    }
}

window.closeMyStats = function() {
    document.getElementById('my-stats-modal').classList.remove('active');
    document.getElementById('my-stats-loader').innerHTML = `<i class="fas fa-circle-notch fa-spin fa-3x text-accent-icon"></i><p class="loader-text">Pobieranie danych z bazy...</p>`;
}

window.openMyTransactions = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('my-transactions-modal').classList.add('active');
    document.getElementById('my-transactions-loader').classList.remove('hidden');
    document.getElementById('my-transactions-content').classList.add('hidden');
    
    try {
        const [reportsRes, bonusesRes] = await Promise.all([ window.preloadReportsData(), window.preloadBonusesData() ]);
        myStatsRawData = reportsRes.filter(row => row.employee === currentEmployeeName);
        myBonusesRawData = (bonusesRes.bonuses || []).filter(b => b.employee === currentEmployeeName);
        switchTransView('historia');
        document.getElementById('my-transactions-loader').classList.add('hidden');
        document.getElementById('my-transactions-content').classList.remove('hidden');
    } catch (err) {
        document.getElementById('my-transactions-loader').innerHTML = '<p class="text-danger-icon"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.switchTransView = function(view) {
    const btnHist = document.getElementById('btn-trans-historia'), btnPremie = document.getElementById('btn-trans-premie');
    const contHist = document.getElementById('transactions-list-container'), contPremie = document.getElementById('bonuses-list-container');
    const desc = document.getElementById('my-transactions-desc');

    if (view === 'historia') {
        btnHist.classList.add('active'); btnPremie.classList.remove('active');
        contHist.classList.remove('hidden'); contPremie.classList.add('hidden');
        desc.innerText = "Historia Twoich transakcji. Możesz zgłosić pomyłkę w wystawionym paragonie.";
        renderTransactionsList();
    } else {
        btnHist.classList.remove('active'); btnPremie.classList.add('active');
        contHist.classList.add('hidden'); contPremie.classList.remove('hidden');
        desc.innerText = "Historia otrzymanych premii finansowych od zarządu.";
        renderBonusesList();
    }
}

function renderTransactionsList() {
    const container = document.getElementById('transactions-list-container');
    container.innerHTML = '';
    
    if (!myStatsRawData || myStatsRawData.length === 0) {
        container.innerHTML = '<p class="empty-history-msg">Brak transakcji w historii.</p>';
        return;
    }

    const grouped = {};
    myStatsRawData.forEach(row => {
        if (!row.report_id || row.type === 'changelog') return;
        
        if (!grouped[row.report_id]) {
            let displayDate = row.date;
            const d = parseDate(row.date);
            if (d && !isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                displayDate = `${day}.${month}.${year} ${hours}:${minutes}`;
            }

            grouped[row.report_id] = {
                date: displayDate,
                total: 0,
                items: [],
                type: row.type || 'nieznany'
            };
        }
        grouped[row.report_id].total += row.total;
        
        let itemName = row.name || (row.report_id.includes('GOLD') ? 'Przetop złota' : 'Nieznany przedmiot');
        let itemQty = row.qty || 1;
        
        grouped[row.report_id].items.push(`${itemName} (x${itemQty}) - ${row.total}$`);
    });

    const sortedIds = Object.keys(grouped).reverse(); 

    sortedIds.forEach(id => {
        const data = grouped[id];
        
        let typeIcon = '';
        if (data.type === 'skup') typeIcon = '<i class="fas fa-cart-arrow-down text-accent"></i>';
        else if (data.type === 'sprzedaz') typeIcon = '<i class="fas fa-truck-loading text-success"></i>';
        else if (id.includes('GOLD')) typeIcon = '<i class="fa-solid fa-temperature-half text-warning"></i>';
        else typeIcon = '<i class="fas fa-receipt text-secondary"></i>';
        
        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="admin-report-header">
                <span class="transaction-header-type">${typeIcon} ID: ${id}</span>
                <span class="transaction-date">${data.date}</span>
            </div>
            <div class="transaction-body-layout">
                <div class="transaction-items-list">
                    ${data.items.map(item => `<div>- ${item}</div>`).join('')}
                </div>
                <div class="transaction-total-amount">Suma: ${data.total}$</div>
            </div>
            <div class="transaction-actions-layout">
                <button class="report-error-btn" data-action="report-error" data-id="${id}">
                    <i class="fas fa-exclamation-circle"></i> Zgłoś pomyłkę
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    
    if(sortedIds.length === 0) {
         container.innerHTML = '<p class="empty-history-msg">Brak zidentyfikowanych transakcji z ID.</p>';
    }
}

function renderBonusesList() {
    const container = document.getElementById('bonuses-list-container');
    container.innerHTML = '';
    
    if (!myBonusesRawData || myBonusesRawData.length === 0) {
        container.innerHTML = '<p class="empty-history-msg">Brak przyznanych premii w historii.</p>';
        return;
    }

    const sortedBonuses = myBonusesRawData.sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedBonuses.forEach(b => {
        let displayDate = b.date;
        if (typeof displayDate === 'string' && displayDate.includes('T')) displayDate = new Date(displayDate).toLocaleString('pl-PL');
        let statusBadge = b.status === 'Odebrane' ? `<span class="status-badge-received">Odebrane</span>` : `<span class="status-badge-new">Nowe</span>`;
        const div = document.createElement('div');
        div.className = 'transaction-item-card';
        div.innerHTML = `
            <div class="admin-report-header"><span class="transaction-header-type gold"><i class="fas fa-gift"></i> Od: ${b.boss}</span><span class="transaction-date">${displayDate}</span></div>
            <div class="transaction-body-layout">
                <div class="bonus-item-desc">${b.reason || 'Brak notatki'}</div>
                <div class="flex-between-center"><div class="transaction-total-amount lg">+${window.formatMoney(b.amount)}$</div>${statusBadge}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.closeMyTransactions = function() {
    document.getElementById('my-transactions-modal').classList.remove('active');
    document.getElementById('my-transactions-loader').innerHTML = `<i class="fas fa-circle-notch fa-spin fa-3x text-accent-icon"></i><p class="loader-text">Pobieranie historii z bazy...</p>`;
}

window.openReportModal = function(receiptId) {
    currentReportReceiptId = receiptId;
    document.getElementById('report-receipt-id').innerText = receiptId;
    document.getElementById('report-reason-input').value = "";
    document.getElementById('report-transaction-modal').classList.add('active');
}

window.closeReportModal = function() {
    document.getElementById('report-transaction-modal').classList.remove('active');
    currentReportReceiptId = "";
}

window.submitTransactionReport = async function() {
    const reason = document.getElementById('report-reason-input').value.trim();
    if (!reason) return showNotice("Podaj powód zgłoszenia!", "warning");

    const btn = document.getElementById('submit-report-btn');
    const originalHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wysyłanie...';

    try {
        const embedPayload = {
            content: "<@303630730528030720>", 
            embeds: [{
                title: "⚠️ Zgłoszenie pomyłki w transakcji!", color: 15158332, 
                fields: [
                    { name: "📋 Numer paragonu:", value: `\`${currentReportReceiptId}\``, inline: true },
                    { name: "👤 Zgłaszający:", value: `**${currentEmployeeName}**\nSSN: \`${currentEmployeeSsn}\`\nStopień: \`${currentEmployeeRank}\``, inline: true },
                    { name: "📝 Powód / Opis błędu:", value: reason, inline: false }
                ],
                timestamp: new Date().toISOString(), footer: { text: "System EL CARTEL PAWN SHOP" }
            }]
        };

        const resDiscord = await fetch(DISCORD_WEBHOOK_URL_SKUP, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(embedPayload) });
        const resSheet = await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'save_error_report', date: getFormattedDateTime(), employee: currentEmployeeName, receipt_id: currentReportReceiptId, reason: reason }) });

        if (resDiscord.ok && resSheet.ok) {
            showNotice("Zgłoszenie wysłane na Discord!", "success");
            window.addSystemLog('ZGŁOSZENIE POMYŁKI', `Zgłoszono pomyłkę w transakcji. Paragon: ${currentReportReceiptId}, Powód: ${reason}`);
            closeReportModal();
        } else throw new Error("Błąd.");
    } catch (e) { showNotice("Błąd wysyłania!", "danger"); } 
    finally { btn.disabled = false; btn.innerHTML = originalHtml; }
}

window.openAdminReports = async function() {
    if (!isTravisVance()) return showNotice("Brak uprawnień!", "danger");
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('admin-reports-modal').classList.add('active');
    document.getElementById('admin-reports-loader').classList.remove('hidden');
    document.getElementById('admin-reports-container').innerHTML = '';

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_error_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        const container = document.getElementById('admin-reports-container');
        container.innerHTML = '';
        
        const pendingReports = data.filter(r => r.status === 'Oczekujące').reverse();
        const resolvedReports = data.filter(r => r.status !== 'Oczekujące').reverse().slice(0, 10); 
        
        if (pendingReports.length === 0 && resolvedReports.length === 0) {
            container.innerHTML = '<p class="empty-history-msg">Brak zgłoszeń.</p>';
        } else {
            let html = '';
            if (pendingReports.length > 0) {
                html += '<h3 class="admin-report-title-warning">Wymagają uwagi</h3>';
                pendingReports.forEach(r => html += buildAdminReportCard(r));
            }
            if (resolvedReports.length > 0) {
                html += '<h3 class="admin-report-title-success">Ostatnio rozwiązane</h3>';
                resolvedReports.forEach(r => html += buildAdminReportCard(r));
            }
            container.innerHTML = html;
        }
    } catch (e) { document.getElementById('admin-reports-container').innerHTML = '<p class="text-danger-icon" style="text-align:center;">Błąd.</p>'; } 
    finally { document.getElementById('admin-reports-loader').classList.add('hidden'); }
}

function buildAdminReportCard(r) {
    let statusColor = r.status === 'Oczekujące' ? 'var(--warning)' : (r.status === 'Zaakceptowane' ? 'var(--success)' : 'var(--danger)');
    let actionsHtml = r.status === 'Oczekujące' ? `<div class="admin-report-actions"><button class="btn-reject" data-action="admin-status" data-id="${r.receipt_id}" data-status="Odrzucone">Odrzuć</button><button class="btn-accept" data-action="admin-status" data-id="${r.receipt_id}" data-status="Zaakceptowane">Zaakceptuj pomyłkę</button></div>` : '';
    
    let displayDate = r.date;
    if (typeof displayDate === 'string' && displayDate.includes('T')) {
        displayDate = new Date(displayDate).toLocaleString('pl-PL');
    }

    return `<div class="admin-report-card"><div class="admin-report-header"><span class="admin-report-id"><i class="fas fa-hashtag"></i> ID: ${r.receipt_id}</span><span class="admin-report-date transaction-date">${displayDate}</span></div><div class="admin-report-emp"><span class="text-secondary">Zgłasza:</span> <strong class="text-primary">${r.employee}</strong></div><div class="admin-report-reason"><span class="text-secondary">Powód:</span> <span class="text-white-inline">${r.reason}</span></div><div class="admin-report-status"><span class="text-secondary">Status:</span> <strong style="color: ${statusColor};">${r.status}</strong></div>${actionsHtml}</div>`;
}

window.closeAdminReports = function() { document.getElementById('admin-reports-modal').classList.remove('active'); }

window.updateReportStatus = async function(receiptId, newStatus) {
    if (!isTravisVance()) return;
    try {
        showNotice("Aktualizowanie...", "info");
        await fetch(REPORTS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'update_error_report', receipt_id: receiptId, new_status: newStatus }) });
        showNotice(`Zgłoszenie zaktualizowane: ${newStatus}`, "success");
        window.addSystemLog('STATUS ZGŁOSZENIA', `Zmieniono status zgłoszenia [${receiptId}] na: ${newStatus}`);
        openAdminReports(); 
    } catch(e) { showNotice("Wystąpił błąd podczas aktualizacji!", "danger"); }
}

window.openIdCard = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    
    if (currentEmployeeName) {
        document.getElementById('id-card-name').innerText = currentEmployeeName.toUpperCase();
        document.getElementById('id-card-ssn').innerText = currentEmployeeSsn;
        document.getElementById('id-card-date-zatrudnienia').innerText = currentEmployeeDateZatrudnienia;
        const photoContainer = document.getElementById('id-card-photo-container');
        if (currentEmployeePhoto && currentEmployeePhoto !== "") photoContainer.innerHTML = `<img src="${currentEmployeePhoto}" alt="Zdjęcie postaci" class="id-photo-img">`;
        else photoContainer.innerHTML = `<i class="fas fa-user-tie"></i>`;
        document.getElementById('id-card-signature').innerText = currentEmployeeName;
        document.getElementById('id-card-rank-container').innerHTML = `<span class="active-rank">${currentEmployeeRank}</span>`;
        document.getElementById('id-card-level-text').innerText = "Analiza danych...";
        document.getElementById('id-card-xp-text').innerText = "Wczytywanie XP...";
        document.getElementById('id-progress-bar-fill').style.width = "0%";
    }
    
    document.getElementById('id-card-modal').classList.add('active');

    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const rawData = await response.json();
        const myData = rawData.filter(row => row.employee === currentEmployeeName);
        let totalXP = 0; let txSet = new Set();
        myData.forEach(row => { totalXP += row.total; if(row.report_id) txSet.add(row.report_id); });
        
        renderGamification(totalXP);
    } catch (e) {
        document.getElementById('id-card-level-text').innerText = "Błąd pobierania danych";
        document.getElementById('id-card-xp-text').innerText = "Brak połączenia";
    }
}

function renderGamification(totalXP) {
    const levels = [
        { lvl: 1, max: 50000, name: "Rekrut" },
        { lvl: 2, max: 150000, name: "Praktykant" },
        { lvl: 3, max: 350000, name: "Znawca" },
        { lvl: 4, max: 500000, name: "Sprzedawca" },
        { lvl: 5, max: 700000, name: "Specjalista" },
        { lvl: 6, max: 1000000, name: "Ekspert" },
        { lvl: 7, max: 1500000, name: "Starszy ekspert" },
        { lvl: 8, max: 2000000, name: "Weteran" },
        { lvl: 9, max: 3000000, name: "Mistrz handlu" },
        { lvl: 10, max: 4000000, name: "Rekin biznesu" },
        { lvl: 11, max: 5000000, name: "Szara eminencja" },
        { lvl: 12, max: 7500000, name: "Kierownik rewiru" },
        { lvl: 13, max: 10000000, name: "Boss podziemia" },
        { lvl: 14, max: 15000000, name: "Ojciec Chrzestny" },
        { lvl: 15, max: 20000000, name: "Legenda El Cartel" }
    ];
    
    const maxLevel = levels.length;
    let currentLvl = 1, currentMax = levels[0].max, prevMax = 0;
    
    for (let i = 0; i < levels.length; i++) {
        if (totalXP < levels[i].max) { 
            currentLvl = levels[i].lvl; 
            currentMax = levels[i].max; 
            prevMax = i > 0 ? levels[i-1].max : 0; 
            break; 
        }
        if (i === levels.length - 1 && totalXP >= levels[i].max) {
            currentLvl = levels[i].lvl;
            currentMax = levels[i].max;
            prevMax = i > 0 ? levels[i-1].max : 0;
        }
    }
    
    let progressPercent = ((totalXP - prevMax) / (currentMax - prevMax)) * 100;
    if (progressPercent > 100 || currentLvl === maxLevel) progressPercent = 100; 
    if (progressPercent < 0) progressPercent = 0;
    
    document.getElementById('id-card-level-text').innerText = `Poziom ${currentLvl} - ${levels[currentLvl-1].name}`;
    document.getElementById('id-card-xp-text').innerText = currentLvl === maxLevel ? `MAX LEVEL (${totalXP.toLocaleString()}$)` : `${totalXP.toLocaleString()}$ / ${currentMax.toLocaleString()}$`;
    setTimeout(() => { document.getElementById('id-progress-bar-fill').style.width = `${progressPercent}%`; }, 100);
}

window.closeIdCard = function() { document.getElementById('id-card-modal').classList.remove('active'); }

window.openAchievements = async function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('achievements-modal').classList.add('active');
    document.getElementById('achievements-loader').classList.remove('hidden');
    document.getElementById('achievements-container').classList.add('hidden');
    
    try {
        const [rawData, errorReportsData] = await Promise.all([
            window.preloadReportsData(),
            window.preloadErrorReportsData()
        ]);
        
        const myData = rawData.filter(row => row.employee === currentEmployeeName);
        const myErrors = (Array.isArray(errorReportsData) ? errorReportsData : []).filter(row => row.employee === currentEmployeeName).length;
        
        let totalXP = 0; let txSet = new Set();
        myData.forEach(row => { totalXP += row.total; if(row.report_id) txSet.add(row.report_id); });
        let txCount = txSet.size || (myData.length > 0 ? 1 : 0);
        
        renderBadges(totalXP, txCount, myData, rawData, myErrors);
        
        document.getElementById('achievements-loader').classList.add('hidden');
        document.getElementById('achievements-container').classList.remove('hidden');
    } catch (e) {
        document.getElementById('achievements-loader').innerHTML = '<p class="text-danger-icon" style="text-align:center;"><i class="fas fa-exclamation-triangle"></i> Błąd pobierania danych.</p>';
    }
}

window.closeAchievements = function() { 
    document.getElementById('achievements-modal').classList.remove('active'); 
    document.getElementById('achievements-loader').innerHTML = `<i class="fas fa-circle-notch fa-spin fa-3x text-accent-icon"></i><p class="loader-text">Pobieranie danych...</p>`;
}

function renderBadges(totalXP, txCount, myData = [], rawData = [], myErrors = 0) {
    let maxSingleTx = 0;
    let maxSingleBuyTx = 0; 
    let nightShiftCount = 0;
    let weirdStuffCount = 0;
    let goldCount = 0;
    let maxItemsInSingleTx = 0; 
    let electronicsCount = 0; 
    let artCount = 0; 
    let totalSellVolume = 0; 
    let katanaCount = 0;
    let punctualCount = 0; 
    let uniqueClients = new Set();
    
    let clientCounts = {};
    let maxRepeatedClient = 0;
    
    let servedWhileBossOnline = false;
    const bosses = window.currentEmployeesList.filter(e => e.role && e.role.toLowerCase() === 'szef').map(e => e.name);
    let bossTimestamps = [];
    
    let metJamajka = false;
    let jamajkaTimestamps = [];
    const jamajkaStartDate = parseDate("06.06.2026 00:00").getTime(); 
    
    if (rawData && rawData.length > 0) {
        rawData.forEach(row => {
            if (bosses.includes(row.employee) && row.date) {
                bossTimestamps.push(parseDate(row.date).getTime());
            }
            
            if (row.employee && (row.employee.toLowerCase().includes('jamajka') || row.employee.toLowerCase().includes('james brown')) && row.date) {
                const d = parseDate(row.date);
                if (d && !isNaN(d.getTime())) {
                    const time = d.getTime();
                    if (time >= jamajkaStartDate) {
                        jamajkaTimestamps.push(time);
                    }
                }
            }
        });
    }

    let txTimestamps = [];
    let uniqueDays = new Set();

    myData.forEach(tx => {
        if (tx.total > maxSingleTx) maxSingleTx = tx.total;
        if (tx.type === 'skup' && tx.total > maxSingleBuyTx) maxSingleBuyTx = tx.total;
        if (tx.type === 'sprzedaz') totalSellVolume += tx.total;
        if (tx.type === 'skup' && tx.qty > maxItemsInSingleTx) maxItemsInSingleTx = tx.qty;

        if (tx.ssn && String(tx.ssn).trim() !== "") {
            const ssnKey = String(tx.ssn).trim();
            uniqueClients.add(ssnKey);
            
            clientCounts[ssnKey] = (clientCounts[ssnKey] || 0) + 1;
            if (clientCounts[ssnKey] > maxRepeatedClient) {
                maxRepeatedClient = clientCounts[ssnKey];
            }
        }

        let txTime = 0;
        if (tx.date) {
            const txDate = parseDate(tx.date);
            if (txDate && !isNaN(txDate.getTime())) {
                txTime = txDate.getTime();
                txTimestamps.push(txTime);
                
                const hour = txDate.getHours();
                if (hour >= 0 && hour <= 5) nightShiftCount++;
                
                if (txDate.getMinutes() === 0) punctualCount++;
                
                const dayString = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
                uniqueDays.add(dayString);
            }
        }
        
        if (!servedWhileBossOnline && txTime > 0) {
            if (bossTimestamps.some(bTime => Math.abs(bTime - txTime) <= 120 * 60 * 1000)) {
                servedWhileBossOnline = true;
            }
        }

        const myNameLow = currentEmployeeName.toLowerCase();
        if (!metJamajka && txTime >= jamajkaStartDate && !myNameLow.includes('jamajka') && !myNameLow.includes('james brown')) {
            if (jamajkaTimestamps.some(jTime => Math.abs(jTime - txTime) <= 120 * 60 * 1000)) {
                metJamajka = true;
            }
        }

        if (tx.name) {
            const nameLow = tx.name.toLowerCase();
            if (nameLow.includes('dziwna substancja')) weirdStuffCount += (tx.qty || 1);
            if (nameLow.includes('złot') || nameLow.includes('sztabka')) goldCount += (tx.qty || 1);
            if (nameLow.includes('telefon') || nameLow.includes('telewizor') || nameLow.includes('konsola') || nameLow.includes('komputer') || nameLow.includes('monitor') || nameLow.includes('mikrofala')) {
                electronicsCount += (tx.qty || 1);
            }
            if (nameLow.includes('obraz') || nameLow.includes('książka') || nameLow.includes('dywan')) {
                artCount += (tx.qty || 1);
            }
            if (nameLow.includes('katana')) katanaCount += (tx.qty || 1);
        }
    });

    let currentStreak = 0, previousDateStr = null;
    const sortedDays = Array.from(uniqueDays).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDays.forEach(dayStr => {
        if (!previousDateStr) {
            currentStreak = 1;
        } else {
            const currentDate = new Date(dayStr);
            const diffDays = Math.round(Math.abs(currentDate - new Date(previousDateStr)) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) currentStreak++;
            else currentStreak = 1; 
        }
        previousDateStr = dayStr;
    });

    if (previousDateStr) {
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        
        const lastTxDate = new Date(previousDateStr);
        lastTxDate.setHours(0, 0, 0, 0);
        
        const diffFromToday = Math.round((todayObj - lastTxDate) / (1000 * 60 * 60 * 24));
        
        if (diffFromToday > 1) {
            currentStreak = 0;
        }
    } else {
        currentStreak = 0;
    }

    let fastHustleAchieved = 0;
    txTimestamps.sort((a, b) => a - b);
    for (let i = 0; i <= txTimestamps.length - 5; i++) {
        if (txTimestamps[i + 4] - txTimestamps[i] <= 10 * 60 * 1000) {
            fastHustleAchieved = 1;
            break;
        }
    }

    const tierColors = ["#cd7f32", "#c0c0c0", "#fbbf24"]; 

    const badges = [
        { icon: "fa-handshake", name: "Solidna firma", desc: "Zrealizuj udane transakcje z klientami.", current: txCount, 
          tiers: [{ max: 50, color: tierColors[0] }, { max: 150, color: tierColors[1] }, { max: 450, color: tierColors[2] }] },
          
        { icon: "fa-fish", name: "Rekin biznesu", desc: "Wygeneruj obrót w firmie.", current: totalXP, isMoney: true, 
          tiers: [{ max: 100000, color: tierColors[0] }, { max: 500000, color: tierColors[1] }, { max: 2000000, color: tierColors[2] }] },
          
        { icon: "fa-flask", name: "Chemiczny Ali", desc: "Przetwórz dziwne substancje.", current: weirdStuffCount, 
          tiers: [{ max: 25, color: tierColors[0] }, { max: 50, color: tierColors[1] }, { max: 100, color: tierColors[2] }] },
          
        { icon: "fa-coins", name: "Gorączka złota", desc: "Skup lub sprzedaj złote przedmioty.", current: goldCount, 
          tiers: [{ max: 50, color: tierColors[0] }, { max: 100, color: tierColors[1] }, { max: 200, color: tierColors[2] }] },
          
        { icon: "fa-moon", name: "Nocny Marek", desc: "Wykonaj transakcje na nocnej zmianie (0:00 - 6:00).", current: nightShiftCount, 
          tiers: [{ max: 10, color: tierColors[0] }, { max: 25, color: tierColors[1] }, { max: 50, color: tierColors[2] }] },
          
        { icon: "fa-boxes", name: "Hurtownik", desc: "Skup określoną ilość przedmiotów na jednym paragonie.", current: maxItemsInSingleTx, 
          tiers: [{ max: 10, color: tierColors[0] }, { max: 20, color: tierColors[1] }, { max: 30, color: tierColors[2] }] },
          
        { icon: "fa-laptop", name: "Elektro-śmieciarz", desc: "Obracaj sprzętem elektronicznym.", current: electronicsCount, 
          tiers: [{ max: 50, color: tierColors[0] }, { max: 150, color: tierColors[1] }, { max: 250, color: tierColors[2] }] },
          
        { icon: "fa-truck-loading", name: "Wilk z Wall Street", desc: "Sprzedaj towar z magazynu.", current: totalSellVolume, isMoney: true, 
          tiers: [{ max: 100000, color: tierColors[0] }, { max: 400000, color: tierColors[1] }, { max: 850000, color: tierColors[2] }] },
          
        { icon: "fa-users", name: "Znajoma twarz", desc: "Obsłuż unikalnych klientów (różne numery SSN).", current: uniqueClients.size, 
          tiers: [{ max: 20, color: tierColors[0] }, { max: 40, color: tierColors[1] }, { max: 70, color: tierColors[2] }] },
          
        { icon: "fa-id-badge", name: "Stały bywalec", desc: "Zbuduj zaufanie na dzielnicy. Obsłuż tego samego klienta (ten sam numer SSN) wielokrotnie.", current: maxRepeatedClient, 
          tiers: [{ max: 10, color: tierColors[0] }, { max: 20, color: tierColors[1] }, { max: 30, color: tierColors[2] }] },
          
        { icon: "fa-fire", name: "Pracoholik", desc: "Zrealizuj przynajmniej jedną transakcję dziennie pod rząd.", current: currentStreak, 
          tiers: [{ max: 7, color: tierColors[0] }, { max: 14, color: tierColors[1] }, { max: 30, color: tierColors[2] }] },

        { icon: "fa-hourglass-start", name: "Punktualny", desc: "W firmie zjawiasz się co do minuty. Zrealizuj transakcję dokładnie o pełnej godzinie (np. 14:00, 18:00).", current: punctualCount, 
          tiers: [{ max: 1, color: tierColors[0] }, { max: 5, color: tierColors[1] }, { max: 10, color: tierColors[2] }] },

        { icon: "fa-bolt", name: "Szybka fucha", desc: "Zrealizuj 5 transakcji w czasie poniżej 10 minut.", current: fastHustleAchieved, 
          tiers: [{ max: 1, color: "#f97316" }] },
          
        { icon: "fa-briefcase", name: "Prawa ręka", desc: "Zrealizuj transakcję na tej samej zmianie z szefem.", current: servedWhileBossOnline ? 1 : 0, 
          tiers: [{ max: 1, color: "#eab308" }] },
          
        { icon: "fa-feather", name: "Czyste sumienie", desc: "Zrealizuj minimum 50 transakcji nie mając żadnej pomyłki.", current: (txCount >= 50 && myErrors === 0) ? 1 : 0, 
          tiers: [{ max: 1, color: "#14b8a6" }] },
          
        { icon: "fa-ghost", name: "Duch Jamajki", desc: "Udało ci się spotkać legendę. Zrealizowałeś transakcję na tej samej zmianie co Jamajka.", current: metJamajka ? 1 : 0, 
          tiers: [{ max: 1, color: "#22c55e" }] }
    ];
    
    badges.forEach(b => {
        b.completedTiers = 0;
        for (let i = 0; i < b.tiers.length; i++) {
            if (b.current >= b.tiers[i].max) b.completedTiers++;
        }
        b.isMaxed = (b.completedTiers === b.tiers.length);
    });

    badges.sort((a, b) => {
        if (a.isMaxed && !b.isMaxed) return 1;
        if (!a.isMaxed && b.isMaxed) return -1;
        return 0;
    });

    const container = document.getElementById('achievements-container');
    container.innerHTML = '';
    container.className = 'achievements-grid hidden'; 
    container.style = ''; 

    badges.forEach(b => {
        const completedTiers = b.completedTiers;
        const isMaxed = b.isMaxed;
        const currentTierInfo = isMaxed ? b.tiers[b.tiers.length - 1] : b.tiers[completedTiers];
        const activeColor = completedTiers > 0 ? b.tiers[completedTiers - 1].color : "var(--text-secondary)";
        const hasStarted = b.current > 0;
        
        const displayCurrent = Math.min(b.current, currentTierInfo.max);
        const percentage = (displayCurrent / currentTierInfo.max) * 100;
        
        const currentText = b.isMoney ? window.formatMoney(displayCurrent) + '$' : displayCurrent;
        const maxText = b.isMoney ? window.formatMoney(currentTierInfo.max) + '$' : currentTierInfo.max;

        let dotsHtml = '';
        if (b.tiers.length > 1) {
            dotsHtml = '<div style="display:flex; gap:3px; margin-top:5px;">';
            for (let i = 0; i < b.tiers.length; i++) {
                dotsHtml += `<i class="fas fa-star" style="font-size: 0.6rem; color: ${i < completedTiers ? b.tiers[i].color : 'rgba(255,255,255,0.1)'}"></i>`;
            }
            dotsHtml += '</div>';
        }

        const badgeEl = document.createElement('div');
        badgeEl.className = `achievement-card ${hasStarted ? 'unlocked' : 'locked'}`;
        
        badgeEl.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-icon" style="color: ${activeColor}; border-color: ${activeColor !== 'var(--text-secondary)' ? activeColor : 'transparent'}; box-shadow: ${activeColor !== 'var(--text-secondary)' ? '0 0 15px ' + activeColor + '40' : 'none'};">
                    <i class="fas ${b.icon}"></i>
                </div>
                <div class="achievement-info">
                    <div class="achievement-title" style="color: ${hasStarted ? '#fff' : 'var(--text-secondary)'}">${b.name}</div>
                    <div class="achievement-desc">${b.desc}</div>
                    ${dotsHtml}
                </div>
            </div>
            <div class="achievement-progress-wrapper">
                <div class="achievement-progress-text">
                    ${isMaxed ? `<span style="color: ${activeColor}"><i class="fas fa-check-circle"></i> Ukończono na maxa</span>` : `<span>${currentText} / ${maxText}</span>`}
                </div>
                <div class="achievement-progress-container">
                    <div class="achievement-progress-fill" style="width: ${isMaxed ? 100 : percentage}%; background: ${isMaxed ? activeColor : 'var(--accent-color)'};"></div>
                </div>
            </div>
        `;
        container.appendChild(badgeEl);
    });
}

// ZAKTUALIZOWANA FUNKCJA SHOWNOTICE - NOWY NIEZAWODNY POMIAR CZASU DLA KONTROLEK TIMERA ORAZ OBSŁUGA DŹWIĘKÓW
window.showNotice = function(msg, type = 'info', duration = 3000, soundName = null) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    
    // Tworzymy fizyczny element paska postępu sterowany przez JS
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.style.animationDuration = `${duration}ms`;
    t.appendChild(progress);
    
    container.appendChild(t);
    
    // Odtwarzanie dźwięku systemowego dopasowanego do typu powiadomienia lub wymuszonego parametrem
    if (soundName) {
        window.playSystemSound(soundName);
    } else {
        if (type === 'success') window.playSystemSound('success');
        else if (type === 'danger') window.playSystemSound('error');
        else if (type === 'warning') window.playSystemSound('warning');
        else window.playSystemSound('info');
    }
    
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, duration);
}

window.checkLoyaltyCustomer = async function() {
    const ssnInput = document.getElementById('loyalty-search-ssn').value.trim();
    if(!ssnInput) return showNotice("Podaj numer SSN!", "warning");
    
    if (window.currentEmployeesList && window.currentEmployeesList.length > 0) {
        const isEmployee = window.currentEmployeesList.some(emp => String(emp.ssn) === ssnInput);
        if (isEmployee) {
            currentLoyaltyCustomer = null;
            document.getElementById('loyalty-customer-info').classList.add('hidden');
            return showNotice("Pracownicy firmy nie mogą korzystać z programu lojalnościowego!", "danger");
        }
    }

    const btn = document.getElementById('check-loyalty-btn');
    const origText = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const [loyaltyRes, settingsRes] = await Promise.all([
            fetch(`${REPORTS_API_URL}?action=get_loyalty&t=${new Date().getTime()}`),
            fetch(`${REPORTS_API_URL}?action=get_loyalty_settings&t=${new Date().getTime()}`)
        ]);
        
        const data = await loyaltyRes.json();
        const settingsData = await settingsRes.json();
        
        const loyaltyList = data.loyalty || [];
        const rewardsList = settingsData.rewards || [];
        
        const customer = loyaltyList.find(c => String(c.ssn) === ssnInput);
        
        if(customer) {
            currentLoyaltyCustomer = { ssn: ssnInput, stamps: Number(customer.stamps) };
            document.getElementById('loyalty-display-ssn').innerText = ssnInput;
            document.getElementById('loyalty-display-stamps').innerText = currentLoyaltyCustomer.stamps;
            
            const rewardsGrid = document.querySelector('.loyalty-grid');
            if(rewardsGrid) {
                if(rewardsList.length > 0) {
                    rewardsGrid.innerHTML = rewardsList.map(r => `
                        <div class="item-card loyalty-reward-card">
                            <div>
                                <span class="qty-badge loyalty-reward-badge">Koszt: ${r.cost} pieczątek</span>
                                <div class="loyalty-reward-name">${r.name}</div>
                            </div>
                            <button class="quote-button claim-reward-btn loyalty-reward-btn" onclick="window.claimReward(this)" data-cost="${r.cost}" data-reward="${r.name}"><i class="fas fa-gift"></i> Odbierz nagrodę</button>
                        </div>
                    `).join('');
                } else {
                    rewardsGrid.innerHTML = '<div style="color:var(--text-secondary); width:100%; grid-column: 1 / -1; text-align:center;">Brak dostępnych nagród. Szef musi je skonfigurować w panelu.</div>';
                }
            }
            
            document.getElementById('loyalty-customer-info').classList.remove('hidden');
        } else {
            currentLoyaltyCustomer = null;
            document.getElementById('loyalty-customer-info').classList.add('hidden');
            showNotice("Brak klienta o podanym SSN w bazie.", "warning");
        }
    } catch(e) {
        showNotice("Błąd pobierania danych z bazy!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerText = origText;
    }
}

window.claimReward = async function(btn) {
    if(!currentLoyaltyCustomer) return showNotice("Wyszukaj najpierw klienta!", "warning");
    
    const cost = parseInt(btn.getAttribute('data-cost'));
    const rewardName = btn.getAttribute('data-reward');
    
    if(currentLoyaltyCustomer.stamps < cost) {
        return showNotice(`Niewystarczająca liczba pieczątek! Brakuje: ${cost - currentLoyaltyCustomer.stamps}`, "danger");
    }
    
    if(!confirm(`Czy na pewno chcesz wydać ${cost} pieczątek na: ${rewardName}?`)) return;

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const res = await fetch(REPORTS_API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: 'deduct_loyalty_stamps',
                ssn: currentLoyaltyCustomer.ssn,
                cost: cost
            })
        });

        if (!res.ok) throw new Error("Błąd bazy danych");

        const embedPayload = {
            embeds: [{
                title: "🎁 ODEBRANO NAGRODĘ LOJALNOŚCIOWĄ!",
                color: 15844367, 
                fields: [
                    { name: "👤 Klient (SSN):", value: `\`${currentLoyaltyCustomer.ssn}\``, inline: true },
                    { name: "🧑‍💼 Wydał:", value: `\`${currentEmployeeName}\``, inline: true },
                    { name: "🏆 Nagroda:", value: `**${rewardName}** (Koszt: ${cost} pieczątek)`, inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "System EL CARTEL PAWN SHOP" }
            }]
        };

        await fetch(DISCORD_WEBHOOK_URL_SKUP, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(embedPayload) });
        
        currentLoyaltyCustomer.stamps -= cost;
        document.getElementById('loyalty-display-stamps').innerText = currentLoyaltyCustomer.stamps;
        
        showNotice("Nagroda odebrana! (Punkty pobrane)", "success");
        window.addSystemLog('NAGRODA LOJALNOŚCIOWA', `Wydano nagrodę "${rewardName}" dla klienta SSN: ${currentLoyaltyCustomer.ssn}. Koszt: ${cost} pieczątek.`);

    } catch(e) {
        showNotice("Wystąpił błąd przy pobieraniu punktów!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

async function checkUpdates() {
    try {
        const response = await fetch(`version.json?t=${new Date().getTime()}`);
        const data = await response.json();
        const serverVersion = data.version.trim();
        if (serverVersion !== APP_VERSION) {
            if (localStorage.getItem('update_ignored_version') === serverVersion) return;
            showUpdatePrompt(serverVersion);
        }
    } catch (e) {}
}

function showUpdatePrompt(serverVersion) {
    if (document.getElementById('update-prompt')) return;
    const div = document.createElement('div');
    div.id = 'update-prompt'; div.className = 'update-notify';
    div.innerHTML = `<span><i class="fas fa-sync-alt fa-spin"></i> Wgrano nową wersję!</span><button class="update-btn-refresh" onclick="forceHardReload('${serverVersion}')">Odśwież</button>`;
    document.body.appendChild(div);
}

window.forceHardReload = async function(serverVersion) {
    if (serverVersion) localStorage.setItem('update_ignored_version', serverVersion);
    if ('serviceWorker' in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); for (let reg of registrations) await reg.unregister(); }
    if ('caches' in window) { const cacheNames = await caches.keys(); for (let name of cacheNames) await caches.delete(name); }
    window.location.href = window.location.pathname + '?refresh=' + new Date().getTime();
};

setInterval(checkUpdates, 60000);
setTimeout(checkUpdates, 3000);

window.updateOnlineEmployees = async function() {
    try {
        window.reportsFetchPromise = null;
        const data = await window.preloadReportsData();
        
        const now = new Date().getTime();
        const startOfToday = new Date().setHours(0, 0, 0, 0); 
        
        const empStats = new Map();

        const userTransactions = {};
        data.forEach(row => {
            if (row.employee && row.date && row.employee !== "System") {
                const cleanName = String(row.employee).replace(/\s*\([^)]+\)/g, '').trim();
                
                const txTime = parseDate(row.date).getTime();
                if (!isNaN(txTime) && txTime >= startOfToday) {
                    if (!userTransactions[cleanName]) userTransactions[cleanName] = [];
                    userTransactions[cleanName].push(txTime);
                }
            }
        });

        for (const [emp, times] of Object.entries(userTransactions)) {
            times.sort((a, b) => b - a); 
            let lastSeen = times[0];
            let firstSeen = times[0];
            
            for (let i = 1; i < times.length; i++) {
                if (firstSeen - times[i] <= 60 * 60 * 1000) { 
                    firstSeen = times[i];
                } else {
                    break; 
                }
            }
            empStats.set(emp, { lastSeen, firstSeen });
        }

        const myCurrentCleanName = currentEmployeeName ? String(currentEmployeeName).replace(/\s*\([^)]+\)/g, '').trim() : "";
        
        if (myCurrentCleanName) {
            if (!window.mySessionStart) window.mySessionStart = now;
            if (!empStats.has(myCurrentCleanName)) {
                empStats.set(myCurrentCleanName, { lastSeen: now, firstSeen: window.mySessionStart });
            } else {
                const stats = empStats.get(myCurrentCleanName);
                stats.lastSeen = now; 
                stats.firstSeen = window.mySessionStart; 
            }
        }

        const onlineData = [];
        empStats.forEach((stats, name) => {
            if (now - stats.lastSeen <= 15 * 60 * 1000 || name === myCurrentCleanName) {
                const diffMs = Math.max(0, now - stats.firstSeen);
                const diffMins = Math.floor(diffMs / 60000);
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                
                let timeStr = "";
                if (hours > 0) timeStr += `${hours}h `;
                timeStr += `${mins}m`;
                if (hours === 0 && mins === 0) timeStr = "< 1m";
                
                onlineData.push({ name: name, timeStr: timeStr });
            }
        });

        renderOnlineWidget(onlineData);
    } catch (e) {
        console.error("Błąd widgetu online:", e);
    }
}

function renderOnlineWidget(onlineData) {
    const widget = document.getElementById('online-employees-widget');
    if (!widget) return;

    if (onlineData.length === 0) {
        widget.classList.add('hidden');
        widget.innerHTML = '';
        return;
    }

    widget.classList.remove('hidden');
    let html = '';
    
    onlineData.forEach((user, index) => {
        const emp = window.currentEmployeesList.find(e => e.name === user.name);
        const photo = (emp && emp.photo) ? emp.photo : ''; 
        const avatarHtml = photo 
            ? `<img src="${photo}" class="online-avatar">` 
            : `<div class="online-avatar" style="display:flex; justify-content:center; align-items:center; background:var(--border-color); color:var(--text-secondary); font-size:1.2rem; width:100%; height:100%; border-radius:50%;"><i class="fas fa-user"></i></div>`;

        html += `
            <div class="online-avatar-container" style="z-index: ${100 - index}">
                ${avatarHtml}
                <div class="online-status-dot"></div>
                <div class="online-tooltip">${user.name} [${user.timeStr}]</div>
            </div>
        `;
    });

    widget.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    const ambientContainer = document.createElement('div');
    ambientContainer.id = 'ambient-background';
    document.body.prepend(ambientContainer);

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'ambient-particle';
        
        const size = Math.random() * 2 + 1; 
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.animationDuration = `${Math.random() * 15 + 10}s`; 
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        ambientContainer.appendChild(particle);
    }
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) loginPinInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') login(); });

    document.querySelectorAll('#nav-skup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); switchView('skup'); });
    });

    document.querySelectorAll('#nav-export-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); switchView('export'); });
        btn.addEventListener('mouseenter', () => {
            window.preloadReportsData();
            window.preloadErrorReportsData();
        });
    });

    document.querySelectorAll('#loyalty-floating-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => { 
            e.preventDefault(); 
            switchView('loyalty'); 
            showNotice("UWAGA: System lojalnościowy jest w fazie testów i aktualnie nie obowiązuje w grze!", "warning");
            
            const display = document.getElementById('current-loyalty-rate-display');
            if (display && display.textContent.includes('Ładowanie') && typeof REPORTS_API_URL !== 'undefined') {
                try {
                    const res = await fetch(REPORTS_API_URL + "?action=get_loyalty_settings&t=" + new Date().getTime());
                    const data = await res.json();
                    if (data.rate) {
                        display.innerText = data.rate + "$ = 1 pieczątka";
                    } else {
                        display.innerText = "Brak danych";
                    }
                } catch(e) {
                    display.innerText = "Błąd API";
                }
            }
        });
    });

    document.querySelectorAll('#check-loyalty-btn').forEach(btn => btn.addEventListener('click', window.checkLoyaltyCustomer));
    document.getElementById('loyalty-search-ssn')?.addEventListener('keypress', function(e) { if (e.key === 'Enter') window.checkLoyaltyCustomer(); });

    document.querySelectorAll('.claim-reward-btn').forEach(btn => {
        btn.addEventListener('click', (e) => window.claimReward(e.currentTarget));
    });

    // PODPIĘCIE MENU DLA WSZYSTKICH WIDOKÓW (SKUP, EKSPORT, ZŁOTO)
    document.querySelectorAll('#profile-toggle-btn').forEach(btn => btn.addEventListener('click', toggleUserMenu));
    document.querySelectorAll('#menu-id-card').forEach(btn => btn.addEventListener('click', openIdCard));
    
    document.querySelectorAll('#menu-my-stats').forEach(btn => {
        btn.addEventListener('click', openMyStats);
        btn.addEventListener('mouseenter', () => window.preloadReportsData());
    });

    document.querySelectorAll('#menu-my-trans').forEach(btn => {
        btn.addEventListener('click', openMyTransactions);
        btn.addEventListener('mouseenter', () => {
            window.preloadReportsData();
            window.preloadBonusesData();
        });
    });

    document.querySelectorAll('#menu-achievements').forEach(btn => {
        btn.addEventListener('click', openAchievements);
        btn.addEventListener('mouseenter', () => {
            window.preloadReportsData();
            window.preloadErrorReportsData();
        });
    });

    document.getElementById('close-achievements-btn')?.addEventListener('click', closeAchievements);
    document.querySelectorAll('#menu-changelog').forEach(btn => btn.addEventListener('click', openChangelog));
    document.querySelectorAll('#admin-changelog-btn').forEach(btn => btn.addEventListener('click', openAdminChangelog));
    document.querySelectorAll('#admin-reports-btn').forEach(btn => btn.addEventListener('click', openAdminReports));
    document.querySelectorAll('#menu-settings').forEach(btn => btn.addEventListener('click', openSettings));
    document.querySelectorAll('#menu-logout').forEach(btn => btn.addEventListener('click', logout));
    
    document.querySelectorAll('#menu-pager').forEach(btn => btn.addEventListener('click', window.openPagerPrompt));

    document.getElementById('login-btn-action')?.addEventListener('click', login);

    document.getElementById('search-input')?.addEventListener('input', applyFilters);
    document.getElementById('search-input-export')?.addEventListener('input', applyFiltersExport);

    document.querySelectorAll('#skup-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterCategory(e.currentTarget.dataset.category, e.currentTarget));
    });

    document.querySelectorAll('#export-categories .cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterCategoryExport(e.currentTarget.dataset.category, e.currentTarget));
    });

    document.getElementById('ad-input')?.addEventListener('input', updateAdPreview);
    document.getElementById('copy-ad-btn-action')?.addEventListener('click', copyAd);

    document.querySelectorAll('#ad-tags-container .tag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => insertTag(e.currentTarget.dataset.tag));
    });

    document.getElementById('add-custom-slot-btn')?.addEventListener('click', addCustomItemSlot);
    document.getElementById('add-custom-slot-btn-export')?.addEventListener('click', addCustomItemSlotExport);
    
    document.getElementById('mobile-toggle-btn')?.addEventListener('click', toggleSummary);
    document.getElementById('summary-toggle-export')?.addEventListener('click', toggleSummaryExport);
    
    document.getElementById('cart-toggle-btn')?.addEventListener('click', toggleCart);
    document.getElementById('cart-toggle-btn-export')?.addEventListener('click', toggleCartExport);
    
    document.getElementById('quote-btn')?.addEventListener('click', generateQuote);
    document.getElementById('quote-btn-export')?.addEventListener('click', generateQuoteExport);

    const finalPriceInput = document.getElementById('final-price-input');
    if(finalPriceInput) finalPriceInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') generateQuote(); });

    document.getElementById('reset-btn')?.addEventListener('click', () => { resetCartAndInventory(); showNotice("Wyczyszczono koszyk!", "warning"); });
    document.getElementById('reset-btn-export')?.addEventListener('click', () => { resetCartAndInventoryExport(); showNotice("Wyczyszczono listę!", "warning"); });

    document.getElementById('close-cart-btn')?.addEventListener('click', toggleCart);
    document.getElementById('close-cart-btn-export')?.addEventListener('click', toggleCartExport);
    
    document.getElementById('close-quote-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('send-discord-btn')?.addEventListener('click', sendToDiscord);
    document.getElementById('copy-receipt-btn')?.addEventListener('click', copyReceiptToClipboard);

    document.getElementById('close-quote-modal-export-btn')?.addEventListener('click', closeModalExport);
    document.getElementById('close-quote-modal-export-btn-2')?.addEventListener('click', closeModalExport);
    document.getElementById('send-discord-btn-export')?.addEventListener('click', sendToDiscordExport);

    document.getElementById('close-settings-modal-btn')?.addEventListener('click', closeSettings);
    document.getElementById('change-pin-btn')?.addEventListener('click', changeEmployeePin);

    document.getElementById('close-my-stats-btn')?.addEventListener('click', closeMyStats);
    document.getElementById('my-stats-time-filter')?.addEventListener('change', (e) => changeStatsTimeRange(e.target.value));

    document.querySelectorAll('#stats-view-toggles .my-stats-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchStatsView(e.currentTarget.dataset.view));
    });

    document.getElementById('close-my-transactions-btn')?.addEventListener('click', closeMyTransactions);
    document.querySelectorAll('#trans-view-toggles .my-stats-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTransView(e.currentTarget.dataset.view));
    });

    document.getElementById('close-report-modal-btn')?.addEventListener('click', closeReportModal);
    document.getElementById('submit-report-btn')?.addEventListener('click', submitTransactionReport);

    document.getElementById('close-admin-reports-btn')?.addEventListener('click', closeAdminReports);
    
    document.getElementById('close-changelog-modal-btn')?.addEventListener('click', closeChangelog);
    document.getElementById('close-admin-changelog-btn')?.addEventListener('click', closeAdminChangelog);
    document.getElementById('add-admin-change-slot-btn')?.addEventListener('click', addAdminChangeSlot);
    document.getElementById('publish-changelog-btn')?.addEventListener('click', publishChangelog);

    document.getElementById('close-edit-changelog-btn')?.addEventListener('click', closeEditChangelog);
    document.getElementById('add-edit-change-slot-btn')?.addEventListener('click', addEditChangeSlot);
    document.getElementById('save-edit-cl-btn')?.addEventListener('click', saveEditedChangelog);
    
    document.getElementById('close-id-card-btn')?.addEventListener('click', closeIdCard);
    document.getElementById('close-bonus-notification-btn')?.addEventListener('click', closeBonusNotification);
    document.getElementById('claim-bonus-notification-btn')?.addEventListener('click', closeBonusNotification);

    document.getElementById('close-pager-modal-btn')?.addEventListener('click', () => document.getElementById('pager-modal').classList.remove('active'));
    document.getElementById('submit-pager-btn')?.addEventListener('click', window.sendPagerMessage);

    const handleListClick = (e, listType) => {
        const btn = e.target.closest('.btn-circle') || e.target.closest('.cart-btn-circle');
        if (btn) {
            const index = parseInt(btn.getAttribute('data-index'));
            const action = btn.getAttribute('data-action');
            if (action === 'add') {
                if(listType === 'skup') updateCount(index, 1);
                else updateCountExport(index, 1);
            } else if (action === 'minus') {
                if(listType === 'skup') updateCount(index, -1);
                else updateCountExport(index, -1);
            }
        }
    };

    document.getElementById('items-list')?.addEventListener('click', (e) => handleListClick(e, 'skup'));
    document.getElementById('items-list-export')?.addEventListener('click', (e) => handleListClick(e, 'export'));
    document.getElementById('cart-items-container')?.addEventListener('click', (e) => handleListClick(e, 'skup'));
    document.getElementById('cart-items-container-export')?.addEventListener('click', (e) => handleListClick(e, 'export'));

    const handleListInput = (e, listType) => {
        if(e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') handleInput(index, e.target.value);
            else handleInputExport(index, e.target.value);
        } else if (e.target.classList.contains('custom-item-name') || e.target.classList.contains('custom-name-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') updateCustomName(index, e.target.value);
            else updateCustomNameExport(index, e.target.value);
        } else if (e.target.classList.contains('custom-item-price') || e.target.classList.contains('custom-price-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            if(listType === 'skup') updateCustomPrice(index, e.target.value);
            else updateCustomPriceExport(index, e.target.value);
        }
    };

    document.getElementById('items-list')?.addEventListener('input', (e) => handleListInput(e, 'skup'));
    document.getElementById('items-list-export')?.addEventListener('input', (e) => handleListInput(e, 'export'));

    const handleAdminSlotRemove = (e) => {
        const btn = e.target.closest('.btn-delete-slot');
        if (btn) btn.closest('.admin-change-slot-layout').remove();
    };
    
    document.getElementById('admin-changes-list')?.addEventListener('click', handleAdminSlotRemove);
    document.getElementById('edit-cl-changes-list')?.addEventListener('click', handleAdminSlotRemove);

    document.getElementById('dynamic-changelog-container')?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-admin-edit');
        if(btnEdit) openEditChangelog(btnEdit.getAttribute('data-version'), btnEdit.getAttribute('data-items'));
        const btnDel = e.target.closest('.btn-admin-del');
        if(btnDel) deleteChangelog(btnDel.getAttribute('data-version'));
    });

    document.getElementById('transactions-list-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.report-error-btn');
        if(btn) openReportModal(btn.getAttribute('data-id'));
    });

    document.getElementById('admin-reports-container')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="admin-status"]');
        if(btn) updateReportStatus(btn.getAttribute('data-id'), btn.getAttribute('data-status'));
    });

    const tiltCard = document.getElementById('tilt-card-element');
    const glare = document.querySelector('.id-card-glare');

    if (tiltCard) {
        tiltCard.addEventListener('mousemove', (e) => {
            const rect = tiltCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateY = ((x - centerX) / centerX) * 12;
            const rotateX = ((centerY - y) / centerY) * 12;

            tiltCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            tiltCard.style.boxShadow = `${-rotateY}px ${rotateX}px 40px rgba(0, 0, 0, 0.7)`;
            
            if (glare) {
                glare.style.opacity = '1';
                glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.3) 0%, transparent 60%)`;
            }
        });

        tiltCard.addEventListener('mouseleave', () => {
            tiltCard.style.transform = `rotateX(0deg) rotateY(0deg)`;
            tiltCard.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5)`;
            if (glare) glare.style.opacity = '0';
        });
    }

    const toggleSkup = document.getElementById('toggle-images-skup');
    if (toggleSkup) {
        toggleSkup.checked = showImagesSkup;
        toggleSkup.addEventListener('change', (e) => {
            showImagesSkup = e.target.checked;
            localStorage.setItem('elcartel_images_skup', showImagesSkup);
            renderInventory();
        });
    }
    
    const toggleExport = document.getElementById('toggle-images-export');
    if (toggleExport) {
        toggleExport.checked = showImagesExport;
        toggleExport.addEventListener('change', (e) => {
            showImagesExport = e.target.checked;
            localStorage.setItem('elcartel_images_export', showImagesExport);
            renderInventoryExport();
        });
    }

    // --- OBSŁUGA PRZEŁĄCZNIKA DŹWIĘKÓW W USTAWIENIACH ---
    const toggleAudio = document.getElementById('toggle-audio-settings');
    if (toggleAudio) {
        toggleAudio.checked = localStorage.getItem('elcartel_audio_enabled') !== 'false';
        toggleAudio.addEventListener('change', (e) => {
            localStorage.setItem('elcartel_audio_enabled', e.target.checked);
            if (e.target.checked) {
                window.playSystemSound('info'); // Krótkie piknięcie testowe przy włączeniu
            }
        });
    }
});

/* ==========================================================================
   SYSTEM WEWNĘTRZNYCH KOMUNIKATÓW (PAGER / KRÓTKOFALÓWKA) - ZAAWANSOWANY MODAL
   ========================================================================== */
let lastPagerTimestamp = Date.now();

// Otwieranie Modalu (Wczytuje listę aktywnych pracowników)
window.openPagerPrompt = function() {
    document.getElementById('user-dropdown').classList.remove('active');
    document.getElementById('pager-msg-input').value = ""; 
    
    const targetSelect = document.getElementById('pager-target-input');
    if (targetSelect) {
        targetSelect.innerHTML = '<option value="ALL">Wszyscy</option>';
        if (window.currentEmployeesList && window.currentEmployeesList.length > 0) {
            window.currentEmployeesList.forEach(emp => {
                const cleanEmpName = String(emp.name).replace(/\s*\([^)]+\)/g, '').trim();
                targetSelect.innerHTML += `<option value="${String(emp.ssn)}">${cleanEmpName} (SSN: ${emp.ssn})</option>`;
            });
        }
    }
    
    document.getElementById('pager-modal').classList.add('active');
}

window.sendPagerMessage = function() {
    const msg = document.getElementById('pager-msg-input').value.trim();
    const color = document.getElementById('pager-color-input').value;
    const duration = document.getElementById('pager-duration-input').value;
    const targetSsn = document.getElementById('pager-target-input').value;

    if (!msg) return showNotice("Wpisz treść komunikatu!", "warning");

    const btn = document.getElementById('submit-pager-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Nadawanie...';

    const encodedMsg = `${color}|||${duration}|||${msg}`;

    const payload = {
        action: "save_receipt",
        type: "pager_message",
        date: getFormattedDateTime(),
        employee: currentEmployeeName,
        report_id: Date.now().toString(), 
        items: [{ name: encodedMsg, qty: 1, total: 0 }],
        ssn: targetSsn 
    };

    fetch(REPORTS_API_URL, { 
        method: "POST", 
        body: JSON.stringify(payload) 
    }).then(() => {
        showNotice("Komunikat wysłany!", "success");
        window.addSystemLog('PAGER (KOMUNIKAT)', `Wysłano wiadomość z pagera (Odbiorca SSN: ${targetSsn}). Treść: ${msg}`);
        document.getElementById('pager-modal').classList.remove('active'); 
    }).catch(e => {
        showNotice("Zakłócenia! Błąd nadajnika.", "danger");
    }).finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

async function checkPagerMessages() {
    if (!currentEmployeeName) return; 

    try {
        const res = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${Date.now()}`);
        const data = await res.json();
        
        const messages = data.filter(row => row.type === "pager_message");
        let newestTimestamp = lastPagerTimestamp;

        messages.forEach(m => {
            const msgTime = parseInt(m.report_id);
            
            if (msgTime > lastPagerTimestamp) {
                const targetSsn = String(m.ssn).trim();
                const mySsn = String(currentEmployeeSsn).trim();
                
                const senderName = String(m.employee).trim().toLowerCase();
                const myName = String(currentEmployeeName).trim().toLowerCase();

                const isGlobal = (targetSsn === "ALL");
                const isForMe = (targetSsn === mySsn);
                const isFromMe = (senderName === myName);

                if (isGlobal || (isForMe && !isFromMe)) {
                    let msgText = m.name;
                    let msgColor = 'info';
                    let msgDuration = 5000;

                    if (msgText.includes('|||')) {
                        const parts = msgText.split('|||');
                        if (parts.length >= 3) {
                            msgColor = parts[0];
                            msgDuration = parseInt(parts[1]) || 5000;
                            msgText = parts.slice(2).join('|||'); 
                        }
                    }

                    showNotice(`${msgText}`, msgColor, msgDuration, 'pager');
                }
                
                if (msgTime > newestTimestamp) newestTimestamp = msgTime;
            }
        });

        lastPagerTimestamp = newestTimestamp;
    } catch(e) {}
}

setInterval(checkPagerMessages, 15000);

// ==========================================
// AUTOMATYCZNE WYLOGOWANIE PRZY ZAMKNIĘCIU OKNA/KARTY
// ==========================================
window.addEventListener('beforeunload', function() {
    if (currentEmployeeName) {
        fetch(REPORTS_API_URL, {
            method: 'POST',
            keepalive: true,
            body: JSON.stringify({
                action: 'save_log',
                employee: currentEmployeeName,
                type: 'WYLOGOWANIE',
                description: 'Zamknięto kartę lub okno przeglądarki (Automatyczne wylogowanie).'
            })
        });
    }
});