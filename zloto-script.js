const APP_VERSION = "2.7.2";

// ==========================================
// KONFIGURACJA
// ==========================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1503473517679874068/rCdQeWVlliG2MPP3Wzhzg1iJpCO4T9s-LsVW_mXbHUGBI18Xp09YLtqYd4VbZWitLP_f"; 
const PIN_API_URL = "https://script.google.com/macros/s/AKfycbycnbsg8yC8Cqk0tF-6syzBTvTLvO-MyTgx-zqAPjgBXPR132MicKNtjNoq3WMQfmLR/exec";
const REPORTS_API_URL = "https://script.google.com/macros/s/AKfycbwcbHTDSA5H0LO2hWYmBleL0z74CXyLYzm188cvhnQBLdbmrOw0r5OMj7QyPXivMZfzeg/exec";

// Ceny materiałów i wymogi (receptura na 1 sztabkę)
const goldInventory = [
    { name: "Złote kolczyki", price: 200, reqPerBar: 20 },
    { name: "Złota bransoletka", price: 200, reqPerBar: 20 },
    { name: "Złota moneta", price: 200, reqPerBar: 10 }
];

// OSTATECZNA CENA SZTABKI ZŁOTA
const PRICE_PER_GOLD_BAR = 15000; 

let currentEmployeeName = "";
let currentCounts = {};
let isBoss = false;

function getFormattedDate() {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

// OBSŁUGA KLAWISZA ENTER PRZY LOGOWANIU
document.addEventListener('DOMContentLoaded', () => {
    const loginPinInput = document.getElementById('employee-login-pin');
    if (loginPinInput) {
        loginPinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
});

async function login() {
    const pin = document.getElementById('employee-login-pin').value;
    const btn = document.getElementById('login-btn');
    if (!pin) return showNotice("Wprowadź PIN!", "danger");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Weryfikacja...';

    try {
        const response = await fetch(`${PIN_API_URL}?pin=${pin}`);
        const data = await response.json();

        if (data.isValid) {
            // TWARDA BLOKADA: TYLKO DLA RANGI SZEF DO CAŁEJ STRONY
            if (data.role && data.role.toLowerCase() === 'szef') {
                currentEmployeeName = data.name;
                isBoss = true;
                
                document.getElementById('logged-user-name').innerText = currentEmployeeName.toUpperCase();
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('main-app').style.display = 'block';
                document.getElementById('user-profile').style.display = 'block';
                document.getElementById('header-date').innerText = getFormattedDate();
                
                renderGoldItems();

                // Od razu pokazujemy sekcję statystyk, bo każdy wpuszczony to szef
                document.getElementById('boss-stats-section').style.display = 'block';
                loadGoldStats(); // Automatyczne wczytanie po logowaniu
                
                showNotice(`Witaj w odlewni ${data.name}!`, "success");
            } else {
                showNotice("Nie masz uprawnień, aby się zalogować.", "danger");
                document.getElementById('employee-login-pin').value = "";
            }
        } else {
            showNotice("Nieprawidłowy PIN!", "danger");
        }
    } catch (error) {
        showNotice("Błąd bazy PIN!", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Uruchom piec <i class="fas fa-bolt"></i>';
    }
}

function renderGoldItems() {
    const container = document.getElementById('gold-items-list');
    container.innerHTML = goldInventory.map((item, index) => {
        currentCounts[index] = 0;
        return `
            <div class="gold-item-card">
                <div class="gold-item-info">
                    <span class="gold-name">${item.name}</span>
                    <span class="gold-sub">Skup: ${item.price}$ | Receptura: ${item.reqPerBar} szt.</span>
                </div>
                <div class="gold-controls">
                    <button class="gold-btn minus" onclick="updateCount(${index}, -1)">-</button>
                    <input type="number" id="count-${index}" class="gold-input" value="0" min="0" oninput="handleInput(${index}, this.value)">
                    <button class="gold-btn plus" onclick="updateCount(${index}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
}

window.updateCount = function(i, change) {
    currentCounts[i] = Math.max(0, currentCounts[i] + change);
    document.getElementById(`count-${i}`).value = currentCounts[i];
    calculateZloto();
}

window.handleInput = function(i, val) {
    currentCounts[i] = Math.max(0, parseInt(val) || 0);
    calculateZloto();
}

function calculateZloto() {
    let totalSpent = 0;
    let earrings = currentCounts[0] || 0;
    let bracelets = currentCounts[1] || 0;
    let coins = currentCounts[2] || 0;

    totalSpent += earrings * goldInventory[0].price;
    totalSpent += bracelets * goldInventory[1].price;
    totalSpent += coins * goldInventory[2].price;

    let possibleBars = Math.floor(Math.min(
        earrings / goldInventory[0].reqPerBar,
        bracelets / goldInventory[1].reqPerBar,
        coins / goldInventory[2].reqPerBar
    ));

    let barValue = possibleBars * PRICE_PER_GOLD_BAR;
    let pureProfit = barValue - totalSpent;

    document.getElementById('total-cost').innerText = totalSpent + '$';
    document.getElementById('possible-bars').innerText = possibleBars + ' szt.';
    document.getElementById('gold-bar-value').innerText = barValue + '$';

    const pureEl = document.getElementById('pure-profit');
    pureEl.innerText = (pureProfit >= 0 ? '+' : '') + pureProfit + '$';
    pureEl.style.color = pureProfit >= 0 ? 'var(--success)' : 'var(--danger)';
}

async function processSmelting() {
    const totalSpent = parseInt(document.getElementById('total-cost').innerText);
    const possibleBars = parseInt(document.getElementById('possible-bars').innerText);
    const barValue = parseInt(document.getElementById('gold-bar-value').innerText);
    
    if (totalSpent === 0) return showNotice("Piec jest pusty!", "warning");
    if (possibleBars === 0) return showNotice("Za mało materiałów na sztabkę!", "danger");

    const btn = document.getElementById('process-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PRZETAPIANIE...';

    const itemsToLog = [];
    goldInventory.forEach((item, i) => {
        if (currentCounts[i] > 0) {
            itemsToLog.push(`${item.name} x${currentCounts[i]}`);
        }
    });

    const payload = {
        action: "save_receipt",
        type: "zloto", 
        employee: currentEmployeeName,
        date: new Date().toLocaleString('pl-PL'),
        report_id: "GOLD-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        items: itemsToLog.join(", ") + ` => Sztabka Złota x${possibleBars}`,
        total: totalSpent,
        revenue: barValue,
        npc_alt: 0
    };

    try {
        const discordPayload = {
            embeds: [{
                title: "🔥 NOWY WYTOP ZŁOTA",
                color: 15571200,
                fields: [
                    { name: "Pracownik", value: currentEmployeeName, inline: true },
                    { name: "Wydatki na skup", value: payload.total + "$", inline: true },
                    { name: "Wartość sztabek", value: payload.revenue + "$", inline: true },
                    { name: "Zysk na operacji", value: (payload.revenue - payload.total) + "$", inline: false },
                    { name: "Wykorzystane surowce", value: payload.items }
                ],
                timestamp: new Date().toISOString()
            }]
        };
        
        const formData = new FormData();
        formData.append("payload_json", JSON.stringify(discordPayload));

        await fetch(DISCORD_WEBHOOK_URL, { 
            method: "POST", 
            body: formData 
        }).catch(e => console.error("Discord Error:", e));

        await fetch(REPORTS_API_URL, { 
            method: "POST", 
            body: JSON.stringify(payload) 
        }).catch(e => console.error("Google Sheets Error:", e));

        showNotice("Przetopiono pomyślnie! Logi wysłane.", "success");
        resetSmeltery();

        // Jeśli szef właśnie coś przetopił, odświeżamy mu statystyki automatycznie na dole strony!
        if (isBoss) {
            setTimeout(loadGoldStats, 1000); 
        }

    } catch (e) {
        showNotice("Wystąpił nieoczekiwany błąd!", "danger");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-hammer"></i> POTWIERDŹ PRZETOP';
    }
}

function resetSmeltery() {
    goldInventory.forEach((_, i) => {
        currentCounts[i] = 0;
        document.getElementById(`count-${i}`).value = 0;
    });
    calculateZloto();
}

// ==========================================
// FUNKCJE STATYSTYK ZŁOTA (TYLKO DLA SZEFA)
// ==========================================
window.loadGoldStats = async function() {
    if (!isBoss) return; // Zabezpieczenie frontendu

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
        console.error("Błąd ładowania statystyk:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--danger);">Błąd połączenia z bazą. Spróbuj odświeżyć ponownie.</td></tr>';
    } finally {
        if (icon) icon.classList.remove('fa-spin');
    }
}

function logout() {
    location.reload();
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('active');
}

function showNotice(msg, type) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}