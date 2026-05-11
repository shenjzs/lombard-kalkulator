// ==========================================
// WERSJA APLIKACJI I KONFIGURACJA
// ==========================================
const APP_VERSION = "2.7.1";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";

// ==========================================
// LOGOWANIE I AUTORYZACJA
// ==========================================
window.loginBoss = async function() {
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
            if (data.role && data.role.toLowerCase() === 'szef') {
                document.getElementById('logged-boss-name').innerText = data.name.toUpperCase();
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('dashboard-screen').classList.remove('hidden');
                showNotice(`Zalogowano pomyślnie jako ${data.name}`, "success");
                
                // Ładujemy dane dopiero, gdy system wpuści usera
                loadGoldStats(); 
            } else {
                showNotice("Odmowa! Brak uprawnień zarządcy.", "danger");
                document.getElementById('boss-pin-input').value = ""; // Czyści błędny PIN
            }
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (e) {
        showNotice("Błąd połączenia z bazą PIN!", "danger");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Zaloguj <i class="fas fa-unlock"></i>';
    }
}

window.logoutBoss = function() {
    document.getElementById('boss-pin-input').value = "";
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.add('active');
    
    // Czyszczenie tabeli żeby nie wisiała w tle
    document.getElementById('gold-logs-body').innerHTML = '';
    
    showNotice("Wylogowano z panelu statystyk.", "success");
}

// Obsługa Enter dla logowania
document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('boss-pin-input');
    if (pinInput) { 
        pinInput.addEventListener('keypress', e => { 
            if (e.key === 'Enter') loginBoss(); 
        }); 
    }
});

// ==========================================
// GŁÓWNA FUNKCJA POBIERANIA STATYSTYK
// ==========================================
async function loadGoldStats() {
    const tbody = document.getElementById('gold-logs-body');
    const icon = document.getElementById('refresh-icon');

    if (icon) icon.classList.add('fa-spin');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #666;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych z bazy...</td></tr>';
    
    try {
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();

        const goldData = data.filter(row => row.type === "zloto");

        if (goldData.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">Brak zarejestrowanych przetopów w bazie danych.</td></tr>';
            return;
        }

        let spent = 0;
        let revenue = 0;

        if (tbody) {
            tbody.innerHTML = goldData.reverse().map(row => {
                const itemSpent = parseFloat(row.total) || 0;
                const itemRev = parseFloat(row.revenue) || 0;
                spent += itemSpent;
                revenue += itemRev;
                
                let dateDisplay = row.date;
                if(String(dateDisplay).includes('T')) {
                    dateDisplay = new Date(dateDisplay).toLocaleString('pl-PL');
                }

                return `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding: 15px; font-size: 0.85rem; color: #94a3b8;">${dateDisplay}</td>
                        <td style="padding: 15px; font-weight: 700; color: #fff;">${row.employee}</td>
                        <td style="padding: 15px; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4;">${row.items}</td>
                        <td style="padding: 15px; text-align: right; color: var(--danger); font-weight: 600;">-${itemSpent}$</td>
                        <td style="padding: 15px; text-align: right; color: var(--accent-color); font-weight: 800;">+${itemRev}$</td>
                    </tr>
                `;
            }).join('');
        }

        const totalSpentEl = document.getElementById('stat-total-spent');
        if (totalSpentEl) totalSpentEl.innerText = spent + '$';

        const totalRevEl = document.getElementById('stat-total-revenue');
        if (totalRevEl) totalRevEl.innerText = revenue + '$';
        
        const profit = revenue - spent;
        const profitEl = document.getElementById('stat-total-profit');
        if (profitEl) {
            profitEl.innerText = (profit >= 0 ? '+' : '') + profit + '$';
            profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
        }

    } catch (e) {
        console.error("[SYSTEM] BŁĄD:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--danger);">Błąd połączenia z bazą. Spróbuj odświeżyć stronę.</td></tr>';
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

window.loadGoldStats = loadGoldStats;

// System powiadomień
function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}