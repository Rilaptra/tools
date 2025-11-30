/**
 * ERZY TOOLS - FINAL MOBILE FIX
 * Fix: 'reading 0' error & Tap vs Drag detection
 */

(function() { // Wrap in IIFE to prevent global pollution

// --- Constants ---
const STORAGE_KEYS = {
    API_KEY: "geminiApiKey",
    MODEL: "modelSelect",
    HISTORY: "erzyChatHistory"
};

// --- Shadow DOM Setup ---
let shadowHost, shadowRoot;

function initShadowDOM() {
    // Prevent double injection
    if (document.getElementById("erzy-tools-host")) return false;

    shadowHost = document.createElement("div");
    shadowHost.id = "erzy-tools-host";
    // Z-Index Max & Pointer Events None (biar tembus klik ke web asli)
    shadowHost.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; overflow: hidden;";
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: "open" });

    // Inject CSS (Tailwind + Custom)
    const style = document.createElement("style");
    style.textContent = `
        /* Reset & Base */
        :host { all: initial; font-family: sans-serif; line-height: 1.5; }
        * { box-sizing: border-box; }
        
        /* Interactive Class (PENTING: Biar bisa diklik) */
        .erzy-interactive { pointer-events: auto !important; touch-action: none; }
        
        /* Tailwind-ish Classes */
        .fixed { position: fixed; }
        .bg-white { background-color: white; }
        .bg-gray-800 { background-color: #1f2937; }
        .bg-blue-600 { background-color: #2563eb; }
        .text-white { color: white; }
        .text-gray-800 { color: #1f2937; }
        .rounded-full { border-radius: 9999px; }
        .rounded-lg { border-radius: 0.5rem; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .p-4 { padding: 1rem; }
        .p-2 { padding: 0.5rem; }
        .w-14 { width: 3.5rem; }
        .h-14 { height: 3.5rem; }
        .w-full { width: 100%; }
        .hidden { display: none !important; }
        
        /* Menu Animation */
        #erzyPageMenu {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(100%);
            bottom: 0; left: 0; right: 0;
            position: fixed;
            background-color: #1f2937;
            border-top: 2px solid #2563eb;
            border-radius: 1rem 1rem 0 0;
            padding: 1rem;
            color: white;
            z-index: 99999;
            max-height: 80vh;
            overflow-y: auto;
        }
        #erzyPageMenu.open { transform: translateY(0); }
        
        /* Chat Window */
        #erzyChatWin {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 90%; max-width: 350px; height: 500px; max-height: 80vh;
            background: white; border-radius: 0.75rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            display: flex; flex-direction: column;
            border: 1px solid #e5e7eb;
            z-index: 100000;
        }
        .dark-mode #erzyChatWin { background: #1f2937; border-color: #374151; color: white; }
    `;
    shadowRoot.appendChild(style);
    return true;
}

// --- UI Builder ---
function createUI() {
    // 1. GEAR ICON (Tombol Utama)
    const gear = document.createElement("div");
    gear.className = "erzy-interactive fixed w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white";
    gear.style.cssText = "bottom: 30px; right: 30px; font-size: 24px; cursor: pointer; user-select: none; -webkit-user-select: none;";
    gear.innerHTML = "⚙️";
    shadowRoot.appendChild(gear);

    // 2. MENU PANEL
    const menu = document.createElement("div");
    menu.id = "erzyPageMenu";
    menu.className = "erzy-interactive";
    menu.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
            <span style="font-weight: bold; font-family: monospace;">🛠️ Erzy Tools</span>
            <span id="closeMenu" style="cursor: pointer; padding: 5px;">▼</span>
        </div>
        <div id="toolsContainer" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;"></div>
    `;
    shadowRoot.appendChild(menu);

    // 3. CHAT WINDOW (Hidden by default)
    const chat = document.createElement("div");
    chat.id = "erzyChatWin";
    chat.className = "erzy-interactive hidden";
    chat.innerHTML = `
        <div class="p-2 bg-gray-200 dark:bg-gray-700 flex justify-between items-center rounded-t-lg" style="cursor: move;">
            <span class="text-gray-800 font-bold text-sm">🤖 Gemini AI</span>
            <button id="closeChat" class="text-red-500 font-bold px-2">✕</button>
        </div>
        <div id="chatMsgs" style="flex: 1; overflow-y: auto; padding: 10px; font-size: 14px; color: #333;"></div>
        <form id="chatForm" class="p-2 border-t flex">
            <input id="chatInput" placeholder="Tanya sesuatu..." style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
            <button type="submit" class="bg-blue-600 text-white px-3 py-1 ml-2 rounded">➤</button>
        </form>
    `;
    shadowRoot.appendChild(chat);

    return { gear, menu, chat };
}

// --- Logic & Event Handling (THE FIX) ---
function initEvents(ui) {
    // === GEAR DRAG & CLICK LOGIC (SUPER ROBUST) ===
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let startTime = 0;

    // Helper untuk posisi aman (Safety Check)
    const getTouch = (e) => {
        if (e.touches && e.touches.length > 0) return e.touches[0];
        if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0];
        return e; // Mouse event
    };

    ui.gear.addEventListener("touchstart", (e) => {
        // Prevent default browser zooming/scrolling on the button
        // e.preventDefault(); // Jangan preventDefault di start, nanti input text susah
        
        const touch = getTouch(e);
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = new Date().getTime();
        isDragging = false; // Reset status

        // Simpan posisi awal elemen
        const rect = ui.gear.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        // Ubah positioning ke Left/Top agar bisa didrag
        ui.gear.style.bottom = "auto";
        ui.gear.style.right = "auto";
        ui.gear.style.left = initialLeft + "px";
        ui.gear.style.top = initialTop + "px";
    }, { passive: false });

    // Listener di document agar drag tidak putus saat gerak cepat
    document.addEventListener("touchmove", (e) => {
        // Cek apakah targetnya gear (atau kita sedang dragging gear)
        if (e.target !== ui.gear && !isDragging) return;
        
        const touch = getTouch(e);
        if (!touch) return; // FIX ERROR 'reading 0'

        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        // Threshold Logic: Hanya anggap drag jika geser > 5px
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true;
            e.preventDefault(); // Mencegah scroll layar saat drag gear
            ui.gear.style.left = (initialLeft + dx) + "px";
            ui.gear.style.top = (initialTop + dy) + "px";
        }
    }, { passive: false });

    ui.gear.addEventListener("touchend", (e) => {
        const endTime = new Date().getTime();
        const timeDiff = endTime - startTime;

        // LOGIKA KLIK:
        // Jika tidak dragging (geser dikit < 5px) DAN waktu sentuh < 300ms (Tap cepat)
        if (!isDragging && timeDiff < 300) {
            // Ini adalah TAP/KLIK
            ui.menu.classList.toggle("open");
        }
        // Jika Dragging selesai
        isDragging = false;
    });

    // === MENU LOGIC ===
    ui.menu.querySelector("#closeMenu").addEventListener("click", () => {
        ui.menu.classList.remove("open");
    });

    // === TOOLS BUILDER ===
    const addTool = (icon, label, action) => {
        const btn = document.createElement("div");
        btn.style.cssText = "background: #374151; padding: 10px; border-radius: 8px; text-align: center; cursor: pointer; border: 1px solid #4b5563;";
        btn.innerHTML = `<div style="font-size: 24px;">${icon}</div><div style="font-size: 10px; margin-top: 5px; color: #d1d5db;">${label}</div>`;
        btn.onclick = () => { action(); ui.menu.classList.remove("open"); };
        ui.menu.querySelector("#toolsContainer").appendChild(btn);
    };

    addTool("💬", "Chat AI", () => ui.chat.classList.remove("hidden"));
    
    addTool("💻", "Eval JS", () => {
        setTimeout(() => { // Timeout biar menu tutup dulu
            const code = prompt("Jalankan Script JS:");
            if (code) {
                try { alert(eval(code)); } catch (err) { alert("Error: " + err); }
            }
        }, 100);
    });

    addTool("📝", "Select All", () => {
        const s = document.createElement("style");
        s.innerHTML = "* { user-select: text !important; -webkit-user-select: text !important; }";
        document.head.appendChild(s);
        alert("Mode Copy Aktif!");
    });
    
    addTool("🔄", "Reload", () => location.reload());

    // === CHAT LOGIC (SIMPLE) ===
    ui.chat.querySelector("#closeChat").onclick = () => ui.chat.classList.add("hidden");
    
    // Simple Chat Drag
    const header = ui.chat.querySelector("div"); // header div
    let chatDrag = false, cSX, cSY, cIX, cIY;
    header.addEventListener("touchstart", (e) => {
        const t = getTouch(e); cSX=t.clientX; cSY=t.clientY;
        const r = ui.chat.getBoundingClientRect(); cIX=r.left; cIY=r.top;
        chatDrag = true;
    }, {passive:false});
    document.addEventListener("touchmove", (e) => {
        if(!chatDrag) return;
        const t = getTouch(e); if(!t) return;
        e.preventDefault();
        ui.chat.style.left = (cIX + (t.clientX - cSX) + (ui.chat.offsetWidth/2)) + "px"; // Adjust for transform center
        ui.chat.style.top = (cIY + (t.clientY - cSY) + (ui.chat.offsetHeight/2)) + "px";
    }, {passive:false});
    document.addEventListener("touchend", () => chatDrag = false);
}

// --- Main Execution ---
if (initShadowDOM()) {
    const ui = createUI();
    initEvents(ui);
    console.log("Erzy Tools v3 Loaded Successfully");
} else {
    console.log("Erzy Tools already active");
}

})();
