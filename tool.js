// --- Global Constants ---
const CHAT_HISTORY_KEY = "erzyChatHistory";
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";
const GEMINI_MODEL_STORAGE_KEY = "modelSelect";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const PROVIDED_API_KEY = ""; // Masukkan API Key Default di sini jika ada
const PAGE_MENU_GEAR_ICON_POSITION_KEY = "erzyPageMenuGearIconPosition";

// --- Shadow DOM Setup ---
// Kita buat container host dan shadow root sebagai variabel global modul ini
let shadowRoot = null;
let shadowHost = null;

function initShadowDOM() {
  if (document.getElementById("erzy-tools-host")) return; // Sudah ada

  // 1. Buat Host Element di halaman utama
  shadowHost = document.createElement("div");
  shadowHost.id = "erzy-tools-host";
  // Set z-index sangat tinggi pada host agar selalu di atas
  shadowHost.style.position = "fixed";
  shadowHost.style.top = "0";
  shadowHost.style.left = "0";
  shadowHost.style.width = "0"; // Nol agar tidak menutupi klik situs asli
  shadowHost.style.height = "0";
  shadowHost.style.zIndex = "2147483647"; // Max z-index
  document.body.appendChild(shadowHost);

  // 2. Attach Shadow DOM (Mode Open agar bisa diakses JS)
  shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // 3. Inject CSS Frameworks KE DALAM Shadow DOM saja
  // Tailwind CSS (Versi Static CSS agar stabil di Shadow DOM)
  const tailwindLink = document.createElement("link");
  tailwindLink.rel = "stylesheet";
  tailwindLink.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";
  shadowRoot.appendChild(tailwindLink);

  // FontAwesome
  const faLink = document.createElement("link");
  faLink.rel = "stylesheet";
  faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
  shadowRoot.appendChild(faLink);

  // 4. Inject Custom Styles untuk Scrollbar & Reset internal
  const customStyle = document.createElement("style");
  customStyle.textContent = `
    /* Reset dasar agar tampilan konsisten di dalam shadow root */
    :host {
        all: initial; /* Mencegah style inheritance dari situs luar */
        font-family: sans-serif;
    }
    
    /* Custom scrollbar */
    .erzy-chatbot-messages::-webkit-scrollbar { width: 8px; }
    .erzy-chatbot-messages::-webkit-scrollbar-track { background: #f1f1f1; }
    .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
    .erzy-chatbot-messages::-webkit-scrollbar-thumb:hover { background: #555; }
    
    .dark .erzy-chatbot-messages::-webkit-scrollbar-track { background: #4b5563; }
    .dark .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #6b7280; }
    .dark .erzy-chatbot-messages::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
    
    /* Dragging utilities */
    .erzy-dragging, .erzy-dragging * {
        user-select: none !important;
        cursor: grabbing !important;
    }

    /* Override dark mode colors explicitly inside shadow DOM */
    .dark #erzyChatbotWindow { background-color: #1f2937; border-color: #374151; }
    .dark #erzyChatbotHeader { background-color: #374151; border-color: #4b5563; }
    .dark #erzyChatbotHeader h2, .dark #erzyChatbotHeader button { color: #f3f4f6; }
    .dark #erzyChatbotHeader button:hover { color: #d1d5db; }
    .dark #erzyChatbotMessages { background-color: #1f2937; }
    .dark #erzyChatbotInputArea { background-color: #374151; border-color: #4b5563; }
    .dark #erzyChatbotInput { background-color: #1f2937; border-color: #4b5563; color: #f9fafb; }
    .dark #erzyChatbotInput::placeholder { color: #6b7280; }
    
    /* Page Menu Animation */
    #erzyPageMenu {
        transition-property: bottom, transform; 
        bottom: -100%; 
        transform: translateY(100%);
    }
    #erzyPageMenu.erzy-menu-visible {
        bottom: 0;
        transform: translateY(0);
    }
    .dark #erzyPageMenu {
        background-color: rgba(31, 41, 55, 0.85);
        border-color: #4b5563;
    }
    .dark #erzyPageMenu h1 { color: #f3f4f6; }
  `;
  shadowRoot.appendChild(customStyle);
}

// --- Helper Functions ---
// Fungsi wrapper untuk querySelector di dalam shadow root
function getEl(selector) {
  if (!shadowRoot) return null;
  return shadowRoot.querySelector(selector);
}

// --- Classes ---
class ChatBot {
  constructor(model, apiKey, domElements) {
    this.domElements = domElements; // Simpan referensi
    this.chatbotWindow = domElements.chatbotWindow;
    this.messagesContainer = domElements.messagesContainer;
    this.chatInput = domElements.chatInput;
    
    this.apiKey = apiKey || localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || PROVIDED_API_KEY;
    this.model = model || localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;

    if (!localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) && this.apiKey === PROVIDED_API_KEY) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, this.apiKey);
    }
    if (!localStorage.getItem(GEMINI_MODEL_STORAGE_KEY)) {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, this.model);
    }

    this.chatHistory = [];
    this.isDragging = false;
    this.isMinimized = false;
    
    this._loadChatHistory();
    this._setInitialPosition();
    this._attachEventListeners();
  }

  _renderMessage(messageText, isUser, timestamp) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${isUser ? "justify-end" : "justify-start"} group mb-4`; // Added mb-4 explicitly

    let processedMessage = messageText
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, "<br>");

    messageDiv.innerHTML = `
        <div class="${isUser ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"} p-3 rounded-lg max-w-[90%] shadow">
            <div class="text-sm">${processedMessage}</div>
            <p class="text-xs ${isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"} mt-1 text-right">
                ${isUser ? "Anda" : "Bot"} - ${timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
        </div>
    `;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  _addMessageToHistoryAndRender(text, isUser, timestampOverride = null) {
    const timestamp = timestampOverride || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!(text.startsWith("Error:") || text.startsWith("Info:"))) {
      this.chatHistory.push({ text, isUser, timestamp });
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(this.chatHistory));
    }
    this._renderMessage(text, isUser, timestamp);
  }

  _loadChatHistory() {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    this.messagesContainer.innerHTML = "";
    if (savedHistory) {
      this.chatHistory = JSON.parse(savedHistory);
      this.chatHistory.forEach((msg) => this._renderMessage(msg.text, msg.isUser, msg.timestamp));
    } else {
      this._addMessageToHistoryAndRender("Halo! Saya Gemini AI ✨. Ada yang bisa saya bantu hari ini?", false);
    }
  }

  clearHistory() {
    if (confirm("Apakah Anda yakin ingin mereset percakapan ini?")) {
      this.messagesContainer.innerHTML = "";
      this.chatHistory = [];
      localStorage.removeItem(CHAT_HISTORY_KEY);
      this._addMessageToHistoryAndRender("Percakapan direset.", false);
    }
  }

  _getCurrentPageContext() {
    // Kita ambil dari DOM utama (bukan shadow DOM) karena kita ingin membaca konten situs
    try {
      return document.body.innerText.replace(/\s+/g, " ").trim() || "";
    } catch (e) {
      return "";
    }
  }

  async _getGeminiResponse() {
    if (!this.apiKey) {
      this._addMessageToHistoryAndRender("Info: API Key Gemini belum diatur.", false);
      return null;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const pageContext = this._getCurrentPageContext();
    const selectedText = window.getSelection().toString();
    const currentUserPromptMsg = this.chatHistory[this.chatHistory.length - 1];

    if (!currentUserPromptMsg || !currentUserPromptMsg.isUser) return null;

    let prompt = `Konteks Website:\n${pageContext.substring(0, 7000)}\n\n`;
    if (selectedText) prompt += `Teks Terpilih:\n${selectedText}\n\n`;
    prompt += `Pertanyaan User:\n${currentUserPromptMsg.text}`;

    const historyForApi = this.chatHistory.slice(0, -1)
      .filter(msg => !(msg.text.startsWith("Error:") || msg.text.startsWith("Info:")))
      .map(msg => ({ role: msg.isUser ? "user" : "model", parts: [{ text: msg.text }] }));
    
    historyForApi.push({ role: "user", parts: [{ text: prompt }] });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: historyForApi }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result = await response.json();
      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      this._addMessageToHistoryAndRender(`Error: ${error.message}`, false);
      return null;
    }
  }

  async sendRequest(messageFromUser) {
    if (!messageFromUser.trim()) return;
    this._addMessageToHistoryAndRender(messageFromUser, true);
    this.chatInput.value = "";
    this.chatInput.disabled = true;
    this.domElements.sendButton.disabled = true;
    this._showLoading(true);

    const botResponse = await this._getGeminiResponse();

    this._showLoading(false);
    this.chatInput.disabled = false;
    this.domElements.sendButton.disabled = false;
    this.chatInput.focus();

    if (botResponse) this._addMessageToHistoryAndRender(botResponse, false);
  }

  _setInitialPosition() {
    const saved = localStorage.getItem("erzyChatbotWindowPosition");
    if (saved) {
      const { x, y } = JSON.parse(saved);
      this.chatbotWindow.style.left = `${x}px`;
      this.chatbotWindow.style.top = `${y}px`;
      this.chatbotWindow.classList.remove("bottom-5", "right-5");
    } else {
      this.chatbotWindow.style.left = `calc(50vw - 200px)`;
      this.chatbotWindow.style.top = `10vh`;
    }
  }

  _startDrag(e) {
    this.isDragging = true;
    this.chatbotWindow.classList.add("erzy-dragging");
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    // Hitung offset relatif terhadap viewport
    const rect = this.chatbotWindow.getBoundingClientRect();
    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;

    this.chatbotWindow.style.left = `${rect.left}px`;
    this.chatbotWindow.style.top = `${rect.top}px`;
    this.chatbotWindow.style.bottom = "auto";
    this.chatbotWindow.style.right = "auto";

    this._onDragHandler = this._onDrag.bind(this);
    this._stopDragHandler = this._stopDrag.bind(this);

    // Event listener harus di document utama agar drag tidak putus saat mouse keluar window
    document.addEventListener("mousemove", this._onDragHandler);
    document.addEventListener("mouseup", this._stopDragHandler);
    document.addEventListener("touchmove", this._onDragHandler, { passive: false });
    document.addEventListener("touchend", this._stopDragHandler);
  }

  _onDrag(e) {
    if (!this.isDragging) return;
    if (e.type === "touchmove") e.preventDefault();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    // Batasi dalam viewport
    const newX = Math.max(0, Math.min(clientX - this.offsetX, window.innerWidth - this.chatbotWindow.offsetWidth));
    const newY = Math.max(0, Math.min(clientY - this.offsetY, window.innerHeight - this.chatbotWindow.offsetHeight));
    
    this.chatbotWindow.style.left = `${newX}px`;
    this.chatbotWindow.style.top = `${newY}px`;
  }

  _stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.chatbotWindow.classList.remove("erzy-dragging");
    
    localStorage.setItem("erzyChatbotWindowPosition", JSON.stringify({
      x: this.chatbotWindow.offsetLeft,
      y: this.chatbotWindow.offsetTop
    }));

    document.removeEventListener("mousemove", this._onDragHandler);
    document.removeEventListener("mouseup", this._stopDragHandler);
    document.removeEventListener("touchmove", this._onDragHandler);
    document.removeEventListener("touchend", this._stopDragHandler);
  }

  _showLoading(show = true) {
    if (this.domElements.loadingIndicator) {
      this.domElements.loadingIndicator.classList.toggle("hidden", !show);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  _toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const { minimizeButton, inputAreaDiv, loadingIndicator } = this.domElements;
    
    if (this.isMinimized) {
      this.originalHeight = this.chatbotWindow.style.height;
      this.messagesContainer.classList.add("hidden");
      inputAreaDiv.classList.add("hidden");
      loadingIndicator.classList.add("hidden");
      this.chatbotWindow.style.height = "auto";
      minimizeButton.innerHTML = '<i class="fas fa-window-maximize"></i>';
    } else {
      this.messagesContainer.classList.remove("hidden");
      inputAreaDiv.classList.remove("hidden");
      this.chatbotWindow.style.height = this.originalHeight || "600px";
      minimizeButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
    }
  }

  _attachEventListeners() {
    this.domElements.chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendRequest(this.chatInput.value.trim());
    });
    
    this.domElements.chatbotHeader.addEventListener("mousedown", this._startDrag.bind(this));
    this.domElements.chatbotHeader.addEventListener("touchstart", this._startDrag.bind(this), { passive: false });
    
    this.domElements.closeButton.addEventListener("click", () => this.chatbotWindow.classList.add("hidden"));
    this.domElements.minimizeButton.addEventListener("click", this._toggleMinimize.bind(this));
    this.domElements.resetButton.addEventListener("click", () => this.clearHistory());
    
    this.domElements.settingsButton.addEventListener("click", () => {
       const modal = getEl("#erzyGeminiSettingsModal");
       if (modal) modal.classList.toggle("hidden");
    });
  }
  
  updateCredentials(key, model) {
    if (key) { this.apiKey = key; localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key); }
    if (model) { this.model = model; localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model); }
    this._addMessageToHistoryAndRender("Info: Pengaturan diperbarui.", false);
  }
}

class ToolsButton {
  constructor(name, onClickFunction, parentSelector = "#erzyToolsContainer") {
    this.element = document.createElement("button");
    this.element.textContent = name;
    this.element.className = "tools-button w-36 border-2 border-gray-500 bg-gray-700 text-white text-wrap text-center p-2 rounded-md shadow-md hover:bg-gray-600 active:scale-95 transition-transform duration-200 cursor-pointer m-1";
    this.element.addEventListener("click", onClickFunction);
    
    const parent = getEl(parentSelector);
    if(parent) parent.appendChild(this.element);
  }
}

// --- Notification UI ---
function done(message = "Done!") {
  const notificationId = "erzyDoneNotification";
  let notification = getEl(`#${notificationId}`);
  if (notification) notification.remove();

  notification = document.createElement("div");
  notification.id = notificationId;
  notification.textContent = message;
  // Gunakan style inline atau class tailwind yang sudah diinject
  notification.className = "fixed top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold font-mono py-2 px-4 rounded shadow-md z-[100001] transition-opacity duration-300";
  
  shadowRoot.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// --- UI Creation Functions ---

function createChatbotUI() {
  const chatbotWindow = document.createElement("div");
  chatbotWindow.id = "erzyChatbotWindow";
  chatbotWindow.className = "fixed w-full max-w-md h-[600px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 hidden";
  // Note: z-index diatur oleh Shadow Host, jadi di sini tidak perlu z-index extreme, tapi fixed positioning perlu.

  chatbotWindow.innerHTML = `
      <div id="erzyChatbotHeader" class="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200 cursor-move select-none">
        <h2 class="font-semibold text-lg text-gray-800"><i class="fas fa-robot mr-2 text-blue-500"></i>Gemini AI</h2>
        <div class="space-x-1">
          <button id="erzyChatbotSettingsButton" class="p-1 text-gray-600 hover:text-blue-500"><i class="fas fa-cog"></i></button>
          <button id="erzyChatbotResetButton" class="p-1 text-gray-600 hover:text-yellow-500"><i class="fas fa-sync-alt"></i></button>
          <button id="erzyChatbotMinimizeButton" class="p-1 text-gray-600 hover:text-gray-800"><i class="fas fa-window-minimize"></i></button>
          <button id="erzyChatbotCloseButton" class="p-1 text-gray-600 hover:text-red-500"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div id="erzyChatbotMessages" class="flex-grow p-4 overflow-y-auto erzy-chatbot-messages bg-white"></div>
      <div id="erzyChatbotLoadingIndicator" class="hidden p-4 bg-white"><span class="text-sm italic text-gray-500">Bot sedang mengetik...</span></div>
      <div id="erzyChatbotInputArea" class="bg-gray-100 p-3 border-t border-gray-200">
        <form id="erzyChatbotForm" class="flex items-center space-x-2">
          <input type="text" id="erzyChatbotInput" placeholder="Ketik pesan..." class="flex-grow p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" autocomplete="off">
          <button type="submit" id="erzyChatbotSendButton" class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"><i class="fas fa-paper-plane"></i></button>
        </form>
      </div>
  `;
  
  shadowRoot.appendChild(chatbotWindow);

  return {
    chatbotWindow,
    chatbotHeader: chatbotWindow.querySelector("#erzyChatbotHeader"),
    messagesContainer: chatbotWindow.querySelector("#erzyChatbotMessages"),
    chatForm: chatbotWindow.querySelector("#erzyChatbotForm"),
    chatInput: chatbotWindow.querySelector("#erzyChatbotInput"),
    sendButton: chatbotWindow.querySelector("#erzyChatbotSendButton"),
    loadingIndicator: chatbotWindow.querySelector("#erzyChatbotLoadingIndicator"),
    resetButton: chatbotWindow.querySelector("#erzyChatbotResetButton"),
    settingsButton: chatbotWindow.querySelector("#erzyChatbotSettingsButton"),
    minimizeButton: chatbotWindow.querySelector("#erzyChatbotMinimizeButton"),
    closeButton: chatbotWindow.querySelector("#erzyChatbotCloseButton"),
    inputAreaDiv: chatbotWindow.querySelector("#erzyChatbotInputArea"),
  };
}

function createSettingsModal() {
  if (getEl("#erzyGeminiSettingsModal")) return;
  const modal = document.createElement("div");
  modal.id = "erzyGeminiSettingsModal";
  modal.className = "fixed inset-0 bg-gray-900 bg-opacity-90 flex hidden justify-center items-center p-4 z-[100000]";
  
  modal.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg text-gray-200 border border-gray-700">
        <h2 class="text-xl font-bold mb-4">Pengaturan Gemini</h2>
        <form id="erzyGeminiSettingsForm">
            <div class="mb-4">
                <label class="block text-sm mb-1">API Key</label>
                <input type="password" id="erzyModalApiKey" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-blue-500">
            </div>
            <div class="mb-4">
                <label class="block text-sm mb-1">Model</label>
                <select id="erzyModalModelSelect" class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                     <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                     <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
            </div>
            <div class="flex justify-end gap-2">
                <button type="button" id="erzyCloseSettingsModal" class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500">Batal</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">Simpan</button>
            </div>
        </form>
    </div>
  `;
  shadowRoot.appendChild(modal);

  // Modal Logic
  const form = modal.querySelector("#erzyGeminiSettingsForm");
  const closeBtn = modal.querySelector("#erzyCloseSettingsModal");
  
  closeBtn.onclick = () => modal.classList.add("hidden");
  
  // Load initial values
  const apiKeyInput = modal.querySelector("#erzyModalApiKey");
  const modelSelect = modal.querySelector("#erzyModalModelSelect");
  
  // Set value saat modal dibuka (listener di tombol settings chatbot akan mentrigger ini)
  // Tapi kita set default value disini
  apiKeyInput.value = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
  modelSelect.value = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;

  form.onsubmit = (e) => {
    e.preventDefault();
    if (window.erzyChatbotInstance) {
        window.erzyChatbotInstance.updateCredentials(apiKeyInput.value.trim(), modelSelect.value);
    }
    modal.classList.add("hidden");
  };
}

function createPageMenu() {
  if (getEl("#erzyPageMenu")) return;

  const menu = document.createElement("div");
  menu.id = "erzyPageMenu";
  // Fixed positioning relative to the shadow root viewport
  menu.className = "fixed left-0 right-0 min-h-[150px] p-4 bg-gray-800 border-t-2 border-gray-600 text-white z-[99998]";
  menu.style.bottom = "-100%"; // Initial hidden state controlled by CSS class logic
  
  menu.innerHTML = `
    <div class="text-center mb-4 font-mono text-xl border-b border-gray-600 pb-2">Erzy.sh Tools</div>
    <div id="erzyToolsContainer" class="flex flex-wrap justify-center gap-2 max-h-[60vh] overflow-y-auto"></div>
  `;
  
  shadowRoot.appendChild(menu);
  
  // Create Gear Icon
  const gear = document.createElement("div");
  gear.id = "erzyPageMenuGearIcon";
  gear.className = "fixed bottom-5 right-5 w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-[99999] text-gray-800 dark:text-white text-xl";
  gear.innerHTML = '<i class="fas fa-wrench"></i>';
  
  // Gear Drag Logic
  let isDragging = false, startX, startY;
  
  const startDrag = (e) => {
      isDragging = true;
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      const rect = gear.getBoundingClientRect();
      startX = clientX - rect.left;
      startY = clientY - rect.top;
      gear.style.bottom = 'auto'; gear.style.right = 'auto'; // Reset positioning
  };
  
  const onDrag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
      
      const newX = Math.min(window.innerWidth - gear.offsetWidth, Math.max(0, clientX - startX));
      const newY = Math.min(window.innerHeight - gear.offsetHeight, Math.max(0, clientY - startY));
      
      gear.style.left = `${newX}px`;
      gear.style.top = `${newY}px`;
  };
  
  const stopDrag = () => { isDragging = false; };
  
  gear.addEventListener("mousedown", startDrag);
  gear.addEventListener("touchstart", startDrag);
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("touchmove", onDrag, { passive: false });
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchend", stopDrag);

  // Toggle Menu
  gear.addEventListener("click", () => {
      if (!isDragging) menu.classList.toggle("erzy-menu-visible");
  });
  
  shadowRoot.appendChild(gear);
}

// --- Initialization ---

function initialize() {
  initShadowDOM();

  // Apply Dark Mode Class to Shadow Host if user prefers dark mode or system does
  if (localStorage.getItem("erzyDarkMode") === "true" || window.matchMedia("(prefers-color-scheme: dark)").matches) {
      shadowHost.classList.add("dark");
  }

  createPageMenu();
  const domElements = createChatbotUI();
  createSettingsModal();
  
  window.erzyChatbotInstance = new ChatBot(null, null, domElements);

  // Initialize Tools Buttons inside Shadow DOM
  new ToolsButton("JavaScript Evaluator", () => {
      const code = prompt("Eval JS:");
      try { done(eval(code)); } catch(e) { console.error(e); done("Error"); }
  }, "#erzyToolsContainer");
  
  new ToolsButton("Toggle Chatbot", () => {
      const win = getEl("#erzyChatbotWindow");
      win.classList.toggle("hidden");
  }, "#erzyToolsContainer");

  new ToolsButton("Make All Selectable", () => {
     const style = document.createElement("style");
     style.innerHTML = "* { user-select: text !important; -webkit-user-select: text !important; }";
     document.head.appendChild(style); // Ini harus ke document utama
     done("All text selectable!");
  }, "#erzyToolsContainer");

  console.log("Erzy Tools Initialized inside Shadow DOM");
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}
