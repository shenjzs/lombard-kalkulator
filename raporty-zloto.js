// ==========================================
// WERSJA APLIKACJI I KONFIGURACJA
// ==========================================
const APP_VERSION = "2.7.0";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

// ==========================================
// GŁÓWNA FUNKCJA POBIERANIA STATYSTYK
// ==========================================
async function loadGoldStats() {
    const tbody = document.getElementById('gold-logs-body');
    const icon = document.getElementById('refresh-icon');
    
    console.log("[SYSTEM] Rozpoczynam pobieranie danych gold...");

    // Dodanie animacji kręcenia i komunikatu ładowania
    if (icon) icon.classList.add('fa-spin');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #666;"><i class="fas fa-spinner fa-spin"></i> Pobieranie danych z bazy...</td></tr>';
    
    try {
        // Fetch z parametrami unikającymi cache
        const response = await fetch(`${REPORTS_API_URL}?action=get_reports&t=${new Date().getTime()}`);
        const data = await response.json();
        
        console.log("[SYSTEM] Dane odebrane:", data);

        // Filtrowanie tylko typu "zloto"
        const goldData = data.filter(row => row.type === "zloto");

        if (goldData.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">Brak zarejestrowanych przetopów w bazie danych.</td></tr>';
            return;
        }

        let spent = 0;
        let revenue = 0;

        // Renderowanie tabeli
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

        // Aktualizacja kart KPI
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

        console.log("[SYSTEM] Statystyki zaktualizowane pomyślnie.");

    } catch (e) {
        console.error("[SYSTEM] BŁĄD:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--danger);">Błąd połączenia z bazą. Spróbuj odświeżyć stronę (CTRL+F5).</td></tr>';
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

// ==========================================
// INICJALIZACJA PO ZAŁADOWANIU STRONY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Ustawianie nazwy szefa
    const bossNameEl = document.getElementById('logged-boss-name');
    const savedName = localStorage.getItem('elcartel_gold_user_name');
    if (bossNameEl) {
        bossNameEl.innerText = savedName || "ZARZĄD";
    }

    // Odpalenie ładowania
    loadGoldStats();
});

// Udostępnienie funkcji globalnie dla przycisku w HTML
window.loadGoldStats = loadGoldStats;