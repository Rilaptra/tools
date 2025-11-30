/**
 * ERZY TOOLS - MOBILE FIXED VERSION
 * Fix: Touch vs Drag conflict resolved
 */

// --- Global Constants ---
const CHAT_HISTORY_KEY = "erzyChatHistory";
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";
const GEMINI_MODEL_STORAGE_KEY = "modelSelect";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const PROVIDED_API_KEY = ""; 

// --- Shadow DOM Setup ---
let shadowRoot = null;
let shadowHost = null;

function initShadowDOM() {
  if (document.getElementById("erzy-tools-host")) return;

  // 1. Host Element (Fullscreen, Click-through)
  shadowHost = document.createElement("div");
  shadowHost.id = "erzy-tools-host";
  shadowHost.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; overflow: hidden;";
  document.body.appendChild(shadowHost);

  // 2. Attach Shadow
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // 3. Inject Tailwind
  const tailwindLink = document.createElement("link");
  tailwindLink.rel = "stylesheet";
  tailwindLink.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
  shadowRoot.appendChild(tailwindLink);

  // 4. Custom Styles
  const customStyle = document.createElement("style");
  customStyle.textContent = `
    :host { all: initial; font-family: sans-serif; }
    
    /* Interactive Elements must capture pointer events */
    .erzy-interactive { pointer-events: auto !important; }
    
    /* Menu Animation */
    #erzyPageMenu { 
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        transform: translateY(100%); 
        bottom: 0;
    }
    #erzyPageMenu.erzy-menu-open { 
        transform: translateY(0); 
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
    
    /* Dark Mode Support inside Shadow DOM */
    .dark-mode .bg-custom { background-color: #1f2937; color: white; }
    .dark-mode .border-custom { border-color: #374151; }
  `;
  shadowRoot.appendChild(customStyle);
}

function getEl(selector) {
  if (!shadowRoot) return null;
  return shadowRoot.querySelector(selector);
}

// --- ChatBot Logic ---
class ChatBot {
  constructor(dom) {
    this.dom = dom;
    this.apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || PROVIDED_API_KEY;
    this.model = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;
    this.history = [];
    this.init();
  }
  
  init() {
      this.loadHistory();
      this.dom.form.addEventListener("submit", (e) => { e.preventDefault(); this.send(this.dom.input.value); });
      this.dom.closeBtn.addEventListener("click", () => this.dom.window.classList.add("hidden"));
      
      // Settings Logic
      this.dom.settingsBtn.addEventListener("click", () => {
          const m = getEl("#erzySettingsModal");
          if(m) m.classList.remove("hidden");
      });
  }

  appendMsg(text, isUser) {
      const div = document.createElement("div");
      div.className = `flex ${isUser ? "justify-end" : "justify-start"} mb-2`;
      div.innerHTML = `<div class="${isUser ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"} p-2 rounded-lg max-w-[85%] text-sm break-words">${text}</div>`;
      this.dom.msgs.appendChild(div);
      this.dom.msgs.scrollTop = this.dom.msgs.scrollHeight;
      
      if(!text.startsWith("Error:") && !text.startsWith("Info:")) {
          this.history.push({ role: isUser ? "user" : "model", parts: [{ text }] });
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(this.history));
      }
  }

  loadHistory() {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if(saved) {
          this.history = JSON.parse(saved);
          this.history.forEach(h => this.appendMsg(h.parts[0].text, h.role === "user"));
      } else {
          this.appendMsg("Halo! Saya Gemini AI.", false);
      }
  }

  async send(msg) {
      if(!msg.trim()) return;
      this.appendMsg(msg, true);
      this.dom.input.value = "";
      
      if(!this.apiKey) { this.appendMsg("Info: Set API Key di menu Gear.", false); return; }
      
      const ctx = document.body.innerText.substring(0, 5000); // Context page
      const payload = { 
          contents: [
              ...this.history.filter(h => h.role), // Previous history
              { role: "user", parts: [{ text: `Context:\n${ctx}\n\nQuestion: ${msg}` }] }
          ] 
      };

      try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
          });
          const data = await res.json();
          if(data.candidates) this.appendMsg(data.candidates[0].content.parts[0].text, false);
          else throw new Error("No response or Blocked");
      } catch(e) { this.appendMsg("Error: " + e.message, false); }
  }
}

// --- UI Creation ---

function createUI() {
    // 1. CHAT WINDOW
    const chatWin = document.createElement("div");
    chatWin.className = "erzy-interactive fixed w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-300 hidden";
    // Center it initially
    chatWin.style.cssText = "left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1000;"; 
    chatWin.innerHTML = `
        <div id="erzyHeader" class="bg-gray-100 p-2 flex justify-between items-center cursor-move border-b select-none">
            <span class="font-bold text-gray-700">🤖 Gemini AI</span>
            <div>
                <button id="erzySetBtn" class="mr-2">⚙️</button>
                <button id="erzyCloseBtn" class="text-red-500">✕</button>
            </div>
        </div>
        <div id="erzyMsgs" class="flex-grow p-2 overflow-y-auto"></div>
        <form id="erzyForm" class="p-2 border-t flex gap-1">
            <input id="erzyInput" class="flex-grow border rounded px-2 py-1 text-sm" placeholder="Ketik pesan..." autocomplete="off">
            <button class="bg-blue-500 text-white px-3 rounded">➤</button>
        </form>
    `;
    shadowRoot.appendChild(chatWin);

    // 2. MENU PANEL (SLIDING UP)
    const menu = document.createElement("div");
    menu.id = "erzyPageMenu";
    menu.className = "erzy-interactive fixed left-0 right-0 h-auto min-h-[150px] bg-gray-900 text-white z-[99998] p-4 rounded-t-2xl border-t-2 border-blue-500 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]";
    menu.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h3 class="font-mono font-bold text-lg">🛠️ Erzy Tools</h3>
            <button id="erzyCloseMenu" class="text-gray-400 hover:text-white px-2">▼</button>
        </div>
        <div id="erzyTools" class="flex flex-wrap justify-center gap-3"></div>
    `;
    shadowRoot.appendChild(menu);

    // 3. GEAR ICON (FLOATING BUTTON)
    const gear = document.createElement("div");
    gear.className = "erzy-interactive fixed w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center cursor-pointer text-white text-2xl z-[99999] transition-transform active:scale-90";
    gear.style.cssText = "bottom: 20px; right: 20px; touch-action: none;"; // touch-action none important for drag
    gear.innerHTML = "⚙️";
    shadowRoot.appendChild(gear);

    // 4. SETTINGS MODAL
    const modal = document.createElement("div");
    modal.id = "erzySettingsModal";
    modal.className = "erzy-interactive fixed inset-0 bg-black bg-opacity-80 flex hidden justify-center items-center z-[100001]";
    modal.innerHTML = `
        <div class="bg-white p-5 rounded-lg w-80 shadow-lg">
            <h3 class="font-bold mb-3">Settings</h3>
            <input id="apiKeyInput" placeholder="Paste Gemini API Key" class="w-full border p-2 mb-2 rounded text-sm">
            <select id="modelSelect" class="w-full border p-2 mb-4 rounded text-sm">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
            <div class="flex justify-end gap-2">
                <button id="cancelSet" class="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                <button id="saveSet" class="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
            </div>
        </div>
    `;
    shadowRoot.appendChild(modal);

    return { chatWin, menu, gear, modal };
}

// --- Event Handlers (THE FIX IS HERE) ---

function attachEvents(ui) {
    // --- GEAR LOGIC (MOBILE FRIENDLY) ---
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let hasMoved = false;

    const toggleMenu = () => {
        ui.menu.classList.toggle("erzy-menu-open");
    };

    ui.gear.addEventListener("touchstart", (e) => {
        isDragging = true;
        hasMoved = false;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = ui.gear.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        // Convert bottom/right to left/top for dragging
        ui.gear.style.bottom = "auto";
        ui.gear.style.right = "auto";
        ui.gear.style.left = initialLeft + "px";
        ui.gear.style.top = initialTop + "px";
    }, { passive: false });

    document.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        
        // Detect movement threshold (5px)
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
            e.preventDefault(); // Prevent scrolling only if we are dragging the gear
        }

        ui.gear.style.left = (initialLeft + dx) + "px";
        ui.gear.style.top = (initialTop + dy) + "px";
    }, { passive: false });

    ui.gear.addEventListener("touchend", (e) => {
        isDragging = false;
        if (!hasMoved) {
            // MOVEMENT WAS < 5px, SO IT IS A TAP!
            toggleMenu();
        }
    });
    
    // Mouse fallback for PC testing
    ui.gear.addEventListener("mousedown", (e) => {
        isDragging = true; hasMoved = false;
        startX = e.clientX; startY = e.clientY;
        const rect = ui.gear.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        ui.gear.style.bottom = "auto"; ui.gear.style.right = "auto";
        ui.gear.style.left = initialLeft + "px"; ui.gear.style.top = initialTop + "px";
    });
    document.addEventListener("mousemove", (e) => {
        if(!isDragging) return;
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        if(Math.abs(dx)>5 || Math.abs(dy)>5) hasMoved = true;
        ui.gear.style.left = (initialLeft + dx) + "px";
        ui.gear.style.top = (initialTop + dy) + "px";
    });
    ui.gear.addEventListener("mouseup", () => {
        isDragging = false;
        if(!hasMoved) toggleMenu();
    });

    // --- OTHER UI EVENTS ---
    const closeMenuBtn = ui.menu.querySelector("#erzyCloseMenu");
    closeMenuBtn.addEventListener("click", () => ui.menu.classList.remove("erzy-menu-open"));
    
    // Settings Modal
    const saveSet = ui.modal.querySelector("#saveSet");
    const cancelSet = ui.modal.querySelector("#cancelSet");
    const apiIn = ui.modal.querySelector("#apiKeyInput");
    const modelIn = ui.modal.querySelector("#modelSelect");

    apiIn.value = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
    
    saveSet.addEventListener("click", () => {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiIn.value);
        localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, modelIn.value);
        if(window.erzyBot) { window.erzyBot.apiKey = apiIn.value; window.erzyBot.model = modelIn.value; }
        ui.modal.classList.add("hidden");
        alert("Settings Saved!");
    });
    cancelSet.addEventListener("click", () => ui.modal.classList.add("hidden"));
}

// --- INITIALIZE ---
function init() {
    console.log("Erzy Tools Loading...");
    initShadowDOM();
    const ui = createUI();
    attachEvents(ui);
    
    // Create ChatBot Instance
    window.erzyBot = new ChatBot({
        window: ui.chatWin,
        msgs: ui.chatWin.querySelector("#erzyMsgs"),
        form: ui.chatWin.querySelector("#erzyForm"),
        input: ui.chatWin.querySelector("#erzyInput"),
        settingsBtn: ui.chatWin.querySelector("#erzySetBtn"),
        closeBtn: ui.chatWin.querySelector("#erzyCloseBtn"),
    });

    // Add Tool Buttons
    const toolsContainer = ui.menu.querySelector("#erzyTools");
    
    const addButton = (text, icon, action) => {
        const btn = document.createElement("button");
        btn.className = "flex flex-col items-center justify-center w-20 h-20 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-all active:scale-95";
        btn.innerHTML = `<span class="text-2xl mb-1">${icon}</span><span class="text-xs text-center">${text}</span>`;
        btn.onclick = action;
        toolsContainer.appendChild(btn);
    };

    addButton("Chat AI", "💬", () => {
        ui.chatWin.classList.remove("hidden");
        ui.menu.classList.remove("erzy-menu-open");
    });

    addButton("Eval JS", "💻", () => {
        const code = prompt("Masukkan kode JavaScript:");
        if(code) {
            try { alert("Result: " + eval(code)); } catch(e) { alert("Error: " + e); }
        }
    });
    
    addButton("Select All", "📝", () => {
         const s = document.createElement("style");
         s.innerHTML = "* { user-select: text !important; -webkit-user-select: text !important; }";
         document.head.appendChild(s);
         alert("Sekarang semua teks bisa dicopy!");
    });

    console.log("Erzy Tools Ready!");
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
