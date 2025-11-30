// --- Global Constants ---
const CHAT_HISTORY_KEY = "erzyChatHistory";
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";
const GEMINI_MODEL_STORAGE_KEY = "modelSelect";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const PROVIDED_API_KEY = ""; 
const PAGE_MENU_GEAR_ICON_POSITION_KEY = "erzyPageMenuGearIconPosition";

// --- Shadow DOM Setup ---
let shadowRoot = null;
let shadowHost = null;

function initShadowDOM() {
  if (document.getElementById("erzy-tools-host")) return;

  // 1. Buat Host Element
  shadowHost = document.createElement("div");
  shadowHost.id = "erzy-tools-host";
  
  // PERUBAHAN PENTING:
  // Kita buat host memenuhi layar, tapi pointer-events: none (klik tembus ke bawah)
  // Agar elemen tools di dalamnya bisa diklik, kita set pointer-events: auto pada CSS elemennya.
  shadowHost.style.position = "fixed";
  shadowHost.style.top = "0";
  shadowHost.style.left = "0";
  shadowHost.style.width = "100vw";
  shadowHost.style.height = "100vh";
  shadowHost.style.zIndex = "2147483647"; // Max Z-Index
  shadowHost.style.pointerEvents = "none"; // PENTING: Biar situs asli bisa diklik
  shadowHost.style.overflow = "hidden"; // Mencegah scrollbar ganda
  
  document.body.appendChild(shadowHost);

  // 2. Attach Shadow DOM
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // 3. Inject CSS
  // Tailwind
  const tailwindLink = document.createElement("link");
  tailwindLink.rel = "stylesheet";
  tailwindLink.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
  shadowRoot.appendChild(tailwindLink);

  // FontAwesome (Opsional, kita pakai emoji sebagai backup)
  const faLink = document.createElement("link");
  faLink.rel = "stylesheet";
  faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
  shadowRoot.appendChild(faLink);

  // 4. Custom Styles
  const customStyle = document.createElement("style");
  customStyle.textContent = `
    :host { all: initial; font-family: sans-serif; }
    
    /* PENTING: Semua elemen interaktif tools harus pointer-events: auto */
    #erzyPageMenuGearIcon, 
    #erzyPageMenu, 
    #erzyChatbotWindow,
    .erzy-interactive {
        pointer-events: auto !important; 
    }

    /* Scrollbar */
    .erzy-chatbot-messages::-webkit-scrollbar { width: 8px; }
    .erzy-chatbot-messages::-webkit-scrollbar-track { background: #f1f1f1; }
    .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
    
    .dark .erzy-chatbot-messages::-webkit-scrollbar-track { background: #4b5563; }
    .dark .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #6b7280; }

    /* Dragging */
    .erzy-dragging, .erzy-dragging * { user-select: none !important; cursor: grabbing !important; }

    /* Dark Mode Overrides */
    .dark #erzyChatbotWindow { background-color: #1f2937; border-color: #374151; }
    .dark #erzyChatbotHeader { background-color: #374151; border-color: #4b5563; }
    .dark #erzyChatbotHeader h2, .dark #erzyChatbotHeader button { color: #f3f4f6; }
    .dark #erzyChatbotMessages { background-color: #1f2937; }
    .dark #erzyChatbotInputArea { background-color: #374151; border-color: #4b5563; }
    .dark #erzyChatbotInput { background-color: #1f2937; border-color: #4b5563; color: #f9fafb; }
    
    /* Page Menu Animation */
    #erzyPageMenu { transition: bottom 0.3s ease-out, transform 0.3s ease-out; bottom: -100%; transform: translateY(100%); }
    #erzyPageMenu.erzy-menu-visible { bottom: 0; transform: translateY(0); }
    .dark #erzyPageMenu { background-color: rgba(31, 41, 55, 0.95); border-color: #4b5563; }
    .dark #erzyPageMenu h1 { color: #f3f4f6; }
  `;
  shadowRoot.appendChild(customStyle);
}

function getEl(selector) {
  if (!shadowRoot) return null;
  return shadowRoot.querySelector(selector);
}

// --- Logic Classes (ChatBot & Tools) ---
// (Bagian ini sama seperti sebelumnya, dipadatkan)
class ChatBot {
  constructor(model, apiKey, domElements) {
    this.domElements = domElements;
    this.chatbotWindow = domElements.chatbotWindow;
    this.messagesContainer = domElements.messagesContainer;
    this.chatInput = domElements.chatInput;
    this.apiKey = apiKey || localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || PROVIDED_API_KEY;
    this.model = model || localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;
    if (!localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) && this.apiKey === PROVIDED_API_KEY) localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, this.apiKey);
    if (!localStorage.getItem(GEMINI_MODEL_STORAGE_KEY)) localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, this.model);
    this.chatHistory = [];
    this.isDragging = false;
    this._loadChatHistory();
    this._setInitialPosition();
    this._attachEventListeners();
  }
  _renderMessage(text, isUser, timestamp) {
    const div = document.createElement("div");
    div.className = `flex ${isUser ? "justify-end" : "justify-start"} group mb-4`;
    let processed = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded font-mono">$1</code>').replace(/\n/g, "<br>");
    div.innerHTML = `<div class="${isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"} p-3 rounded-lg max-w-[90%] shadow text-sm">${processed}</div>`;
    this.messagesContainer.appendChild(div);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  _addMessageToHistoryAndRender(text, isUser) {
      if (!text.startsWith("Error:") && !text.startsWith("Info:")) {
          this.chatHistory.push({ text, isUser, timestamp: new Date().toLocaleTimeString() });
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(this.chatHistory));
      }
      this._renderMessage(text, isUser, new Date().toLocaleTimeString());
  }
  _loadChatHistory() {
      const h = localStorage.getItem(CHAT_HISTORY_KEY);
      this.messagesContainer.innerHTML = "";
      if(h) { this.chatHistory = JSON.parse(h); this.chatHistory.forEach(m => this._renderMessage(m.text, m.isUser, m.timestamp)); }
      else { this._addMessageToHistoryAndRender("Halo! Saya Gemini AI ✨.", false); }
  }
  async sendRequest(msg) {
      if(!msg.trim()) return;
      this._addMessageToHistoryAndRender(msg, true);
      this.chatInput.value = "";
      // Dummy response logic for UI test if no API key
      if(!this.apiKey) { setTimeout(()=>this._addMessageToHistoryAndRender("Info: API Key belum diatur.", false), 500); return; }
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const historyCtx = this.chatHistory.slice(0, -1).filter(m => !m.text.startsWith("Error") && !m.text.startsWith("Info")).map(m => ({ role: m.isUser?"user":"model", parts:[{text:m.text}] }));
      // Context page
      let context = "";
      try { context = document.body.innerText.substring(0,5000); } catch(e){}
      historyCtx.push({ role: "user", parts: [{ text: `Context:\n${context}\n\nUser Question:\n${msg}` }] });

      try {
          const res = await fetch(apiUrl, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({contents:historyCtx}) });
          const data = await res.json();
          if(data.candidates) this._addMessageToHistoryAndRender(data.candidates[0].content.parts[0].text, false);
          else throw new Error("No response");
      } catch(e) { this._addMessageToHistoryAndRender("Error: " + e.message, false); }
  }
  _setInitialPosition() {
      const saved = localStorage.getItem("erzyChatbotWindowPosition");
      if(saved) { const p = JSON.parse(saved); this.chatbotWindow.style.left = p.x+"px"; this.chatbotWindow.style.top = p.y+"px"; }
      else { this.chatbotWindow.style.left = "20px"; this.chatbotWindow.style.top = "20px"; }
  }
  _attachEventListeners() {
      this.domElements.chatForm.addEventListener("submit", (e)=>{e.preventDefault(); this.sendRequest(this.chatInput.value);});
      this.domElements.closeButton.addEventListener("click", ()=>this.chatbotWindow.classList.add("hidden"));
      
      // Drag Logic
      let isDrag=false, offX, offY;
      const start = (e) => { isDrag=true; const c=e.touches?e.touches[0]:e; const r=this.chatbotWindow.getBoundingClientRect(); offX=c.clientX-r.left; offY=c.clientY-r.top; };
      const move = (e) => { if(!isDrag)return; if(e.type==="touchmove")e.preventDefault(); const c=e.touches?e.touches[0]:e; this.chatbotWindow.style.left=(c.clientX-offX)+"px"; this.chatbotWindow.style.top=(c.clientY-offY)+"px"; };
      const end = () => { if(isDrag) { isDrag=false; localStorage.setItem("erzyChatbotWindowPosition", JSON.stringify({x:this.chatbotWindow.offsetLeft, y:this.chatbotWindow.offsetTop})); } };
      
      this.domElements.chatbotHeader.addEventListener("mousedown", start);
      this.domElements.chatbotHeader.addEventListener("touchstart", start, {passive:false});
      document.addEventListener("mousemove", move);
      document.addEventListener("touchmove", move, {passive:false});
      document.addEventListener("mouseup", end);
      document.addEventListener("touchend", end);
      
      this.domElements.settingsButton.addEventListener("click", ()=> {
          const m = getEl("#erzyGeminiSettingsModal"); if(m) m.classList.toggle("hidden");
      });
  }
  updateCredentials(k, m) { this.apiKey=k; this.model=m; localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, k); localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, m); }
}

// --- UI Creation ---
function createChatbotUI() {
    const div = document.createElement("div");
    div.id = "erzyChatbotWindow";
    // Added 'erzy-interactive' class
    div.className = "erzy-interactive fixed w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col border border-gray-400 hidden";
    div.style.zIndex = "1000"; // Internal z-index
    div.innerHTML = `
        <div id="erzyChatbotHeader" class="bg-gray-200 p-2 flex justify-between items-center cursor-move select-none border-b border-gray-300">
            <span class="font-bold">🤖 Gemini</span>
            <div>
                <button id="erzyChatbotSettingsButton" class="px-1">⚙️</button>
                <button id="erzyChatbotCloseButton" class="px-1">❌</button>
            </div>
        </div>
        <div id="erzyChatbotMessages" class="flex-grow p-2 overflow-y-auto bg-gray-50"></div>
        <div id="erzyChatbotInputArea" class="p-2 border-t">
            <form id="erzyChatbotForm" class="flex gap-1">
                <input id="erzyChatbotInput" class="flex-grow border rounded px-1" placeholder="Tanya..." autocomplete="off">
                <button id="erzyChatbotSendButton" class="bg-blue-500 text-white px-2 rounded">➤</button>
            </form>
        </div>
    `;
    shadowRoot.appendChild(div);
    return {
        chatbotWindow: div,
        chatbotHeader: div.querySelector("#erzyChatbotHeader"),
        messagesContainer: div.querySelector("#erzyChatbotMessages"),
        chatForm: div.querySelector("#erzyChatbotForm"),
        chatInput: div.querySelector("#erzyChatbotInput"),
        settingsButton: div.querySelector("#erzyChatbotSettingsButton"),
        closeButton: div.querySelector("#erzyChatbotCloseButton")
    };
}

function createPageMenu() {
    if (getEl("#erzyPageMenu")) return;

    // 1. MENU PANEL
    const menu = document.createElement("div");
    menu.id = "erzyPageMenu";
    menu.className = "erzy-interactive fixed left-0 right-0 h-48 bg-gray-800 text-white z-[99998] p-4 rounded-t-xl border-t-2 border-blue-500 shadow-2xl";
    menu.style.bottom = "-100%"; // Hidden logic
    menu.innerHTML = `<h3 class="text-center font-mono border-b border-gray-600 pb-2 mb-2">🛠️ Erzy Tools</h3><div id="erzyToolsContainer" class="flex flex-wrap justify-center gap-2"></div>`;
    shadowRoot.appendChild(menu);

    // 2. GEAR ICON (TOMBOL UTAMA)
    const gear = document.createElement("div");
    gear.id = "erzyPageMenuGearIcon";
    gear.className = "erzy-interactive fixed w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center cursor-pointer text-white text-2xl z-[99999] hover:bg-blue-500 active:scale-90 transition-transform";
    // Set posisi awal via JS style langsung agar tidak 0
    gear.style.bottom = "20px";
    gear.style.right = "20px";
    // Gunakan EMOJI agar tidak tergantung FontAwesome
    gear.innerHTML = "⚙️"; 
    
    // Logic Toggle Menu
    gear.addEventListener("click", (e) => {
        // Stop propagation agar tidak dianggap drag
        e.stopPropagation();
        menu.classList.toggle("erzy-menu-visible");
        console.log("Gear Clicked, Menu Toggled");
    });

    // Logic Drag Gear
    let isDrag = false, startX, startY, initialLeft, initialTop;
    const dragStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        isDrag = true;
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = gear.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        // Reset bottom/right to allow left/top positioning
        gear.style.bottom = "auto";
        gear.style.right = "auto";
        gear.style.left = initialLeft + "px";
        gear.style.top = initialTop + "px";
    };

    const dragMove = (e) => {
        if (!isDrag) return;
        if (e.type === "touchmove") e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        gear.style.left = (initialLeft + dx) + "px";
        gear.style.top = (initialTop + dy) + "px";
    };

    const dragEnd = (e) => {
        if(!isDrag) return;
        isDrag = false;
        // Simple click detection vs drag
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        if (Math.abs(touch.clientX - startX) < 5 && Math.abs(touch.clientY - startY) < 5) {
            // It was a click, let the click handler handle it (or call it here)
        }
    };

    gear.addEventListener("mousedown", dragStart);
    gear.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("touchmove", dragMove, { passive: false });
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("touchend", dragEnd);

    shadowRoot.appendChild(gear);
}

function createSettingsModal() {
    if (getEl("#erzyGeminiSettingsModal")) return;
    const modal = document.createElement("div");
    modal.id = "erzyGeminiSettingsModal";
    modal.className = "erzy-interactive fixed inset-0 bg-black bg-opacity-80 flex hidden justify-center items-center z-[100000]";
    modal.innerHTML = `
        <div class="bg-gray-800 p-5 rounded max-w-sm w-full text-white">
            <h3 class="text-xl mb-3">Settings</h3>
            <label class="block text-sm">API Key:</label>
            <input id="erzyModalApiKey" type="password" class="w-full p-2 rounded bg-gray-700 mb-3 border border-gray-600">
            <label class="block text-sm">Model:</label>
            <select id="erzyModalModelSelect" class="w-full p-2 rounded bg-gray-700 mb-4 border border-gray-600">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
            <div class="flex justify-end gap-2">
                <button id="erzyCloseSettings" class="bg-gray-600 px-3 py-1 rounded">Close</button>
                <button id="erzySaveSettings" class="bg-blue-600 px-3 py-1 rounded">Save</button>
            </div>
        </div>
    `;
    shadowRoot.appendChild(modal);
    
    // Logic
    const close = modal.querySelector("#erzyCloseSettings");
    const save = modal.querySelector("#erzySaveSettings");
    const keyIn = modal.querySelector("#erzyModalApiKey");
    const modIn = modal.querySelector("#erzyModalModelSelect");
    
    // Load
    keyIn.value = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
    
    close.onclick = () => modal.classList.add("hidden");
    save.onclick = () => {
        if(window.erzyChatbotInstance) window.erzyChatbotInstance.updateCredentials(keyIn.value, modIn.value);
        modal.classList.add("hidden");
    };
}

// --- Init ---
function initialize() {
    console.log("Initializing Erzy Tools...");
    initShadowDOM();
    
    // Apply dark mode if needed to host
    if(window.matchMedia("(prefers-color-scheme: dark)").matches) shadowHost.classList.add("dark");

    createPageMenu();
    const dom = createChatbotUI();
    createSettingsModal();
    
    window.erzyChatbotInstance = new ChatBot(null, null, dom);

    // Add Tool Buttons
    const container = getEl("#erzyToolsContainer");
    
    const btn1 = document.createElement("button");
    btn1.textContent = "💬 Toggle Chat";
    btn1.className = "erzy-interactive bg-blue-600 text-white px-3 py-2 rounded shadow hover:bg-blue-500";
    btn1.onclick = () => dom.chatbotWindow.classList.toggle("hidden");
    container.appendChild(btn1);

    const btn2 = document.createElement("button");
    btn2.textContent = "💻 Eval JS";
    btn2.className = "erzy-interactive bg-gray-600 text-white px-3 py-2 rounded shadow hover:bg-gray-500";
    btn2.onclick = () => { const c = prompt("Code:"); if(c) try { alert(eval(c)); } catch(e){ alert(e); } };
    container.appendChild(btn2);

    console.log("Erzy Tools Ready!");
    // Uncomment baris di bawah ini jika ingin ada notifikasi popup saat script berhasil dimuat
    // alert("Erzy Tools Loaded Successfully!");
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    initialize();
} else {
    document.addEventListener("DOMContentLoaded", initialize);
}
