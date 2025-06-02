// --- Global Constants ---
const CHAT_HISTORY_KEY = "erzyChatHistory";
const GEMINI_API_KEY_STORAGE_KEY = "geminiApiKey";
const GEMINI_MODEL_STORAGE_KEY = "modelSelect";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const PROVIDED_API_KEY = ""; // API Key
const PAGE_MENU_GEAR_ICON_POSITION_KEY = "erzyPageMenuGearIconPosition";
const ids = {
  pageMenuElement: "#erzyPageMenu",
  toolsContainerElement: "#erzyToolsContainer",
  erzyChatbotWindow: "#erzyChatbotWindow",
};
const elements = {};

// --- Classes ---
class ChatBot {
  constructor(model, apiKey, domElements) {
    // Referensi Elemen DOM dari parameter
    this.chatbotWindow = domElements.chatbotWindow;
    this.chatbotHeader = domElements.chatbotHeader;
    this.messagesContainer = domElements.messagesContainer;
    this.chatForm = domElements.chatForm;
    this.chatInput = domElements.chatInput;
    this.sendButton = domElements.sendButton;
    this.loadingIndicator = domElements.loadingIndicator;
    this.resetButton = domElements.resetButton;
    this.settingsButton = domElements.settingsButton;
    this.minimizeButton = domElements.minimizeButton;
    this.closeButton = domElements.closeButton;
    this.inputAreaDiv = domElements.inputAreaDiv; // Sebelumnya 'inputArea' di createChatbotUI

    // Pengaturan API dan Model
    this.apiKey =
      apiKey ||
      localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) ||
      PROVIDED_API_KEY;
    this.model =
      model ||
      localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) ||
      DEFAULT_GEMINI_MODEL;

    // Simpan API Key dan Model yang mungkin baru diinisialisasi ke localStorage
    if (
      !localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) &&
      this.apiKey === PROVIDED_API_KEY
    ) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, this.apiKey);
    }
    if (!localStorage.getItem(GEMINI_MODEL_STORAGE_KEY)) {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, this.model);
    }

    this.chatHistory = [];
    this.isDragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isMinimized = false;
    this.originalWindowHeight = "";

    this._loadChatHistory(); // Muat histori dulu
    // Tampilkan info API Key default hanya jika baru diinisialisasi dan belum ada histori
    if (
      this.apiKey === PROVIDED_API_KEY &&
      this.chatHistory.length <= 1 &&
      this.chatHistory.some((msg) => msg.text.includes("Halo! Saya Gemini AI"))
    ) {
      this._addMessageToHistoryAndRender(
        "Info: API Key default telah diatur. Anda bisa mengubahnya di Pengaturan Gemini.",
        false
      );
    }

    this._setInitialPosition();
    this._attachEventListeners();
    this._initializeDarkMode();
  }

  _initializeDarkMode() {
    const htmlElement = document.documentElement;
    // Cek juga class 'dark' di body jika tools.js di-inject ke halaman yang sudah punya dark mode sendiri
    if (
      localStorage.getItem("erzyDarkMode") === "true" ||
      (!("erzyDarkMode" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches) ||
      document.body.classList.contains("dark")
    ) {
      htmlElement.classList.add("dark");
      this.chatbotWindow.classList.add("dark"); // Pastikan window chatbot juga ikut dark mode
    } else {
      htmlElement.classList.remove("dark");
      this.chatbotWindow.classList.remove("dark");
    }
  }

  _renderMessage(messageText, isUser, timestamp) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${
      isUser ? "justify-end" : "justify-start"
    } group`;

    let processedMessage = messageText
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    processedMessage = processedMessage.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );
    processedMessage = processedMessage.replace(/\*(.*?)\*/g, "<em>$1</em>");
    processedMessage = processedMessage.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
    ); // Styling untuk code
    processedMessage = processedMessage.replace(/\n/g, "<br>");

    messageDiv.innerHTML = `
            <div class="${
              isUser
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            } p-3 rounded-lg max-w-[80%] shadow">
                <div class="text-sm">${processedMessage}</div>
                <p class="text-xs ${
                  isUser ? "text-blue-200" : "text-gray-500 dark:text-gray-400"
                } mt-1 text-right">${isUser ? "Anda" : "Bot"} - ${
      timestamp ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }</p>
            </div>
        `;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  _addMessageToHistoryAndRender(text, isUser, timestampOverride = null) {
    const timestamp =
      timestampOverride ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageData = { text, isUser, timestamp };

    if (!(text.startsWith("Error:") || text.startsWith("Info:"))) {
      this.chatHistory.push(messageData);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(this.chatHistory));
    }
    this._renderMessage(text, isUser, timestamp);
  }

  _loadChatHistory() {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
      this.chatHistory = JSON.parse(savedHistory);
      this.messagesContainer.innerHTML = "";
      this.chatHistory.forEach((msg) =>
        this._renderMessage(msg.text, msg.isUser, msg.timestamp)
      );
    } else {
      // Pesan selamat datang awal hanya jika tidak ada histori
      this._addMessageToHistoryAndRender(
        "Halo! Saya Gemini AI ✨. Ada yang bisa saya bantu hari ini?",
        false,
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
  }

  clearHistory() {
    // Ganti confirm dengan modal custom jika memungkinkan untuk bookmarklet
    // Untuk sekarang, biarkan confirm agar fungsionalitas tetap ada
    if (
      window.confirm(
        "Apakah Anda yakin ingin mereset percakapan ini? Histori akan dihapus permanen."
      )
    ) {
      this.messagesContainer.innerHTML = "";
      this.chatHistory = [];
      localStorage.removeItem(CHAT_HISTORY_KEY);
      this._addMessageToHistoryAndRender(
        "Percakapan direset. Ada yang bisa saya bantu?",
        false,
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      console.log("Erzy Tools: Chat history reset.");
    }
  }

  _getCurrentPageContext() {
    let currentPageContext = "";
    try {
      // Coba ambil konten utama jika ada, jika tidak fallback ke body.innerText
      const mainContent = document.body;
      currentPageContext = mainContent.innerText || "";
      currentPageContext = currentPageContext.replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error("Erzy Tools: Gagal mengambil konteks halaman:", error);
      currentPageContext = "";
      this._addMessageToHistoryAndRender(
        "Info: Gagal mengambil konteks halaman untuk prompt.",
        false
      );
    }
    return currentPageContext;
  }

  _buildPrompt(context, question, selectedText = null) {
    let prompt = `Berdasarkan informasi berikut, jawab pertanyaan pengguna:\n\n`;
    const maxContextLength = 7000; // Perpanjang sedikit batas konteks
    if (context) {
      prompt += `--- Konteks Halaman Web ---\n${context.substring(
        0,
        maxContextLength
      )}${context.length > maxContextLength ? "..." : ""}\n\n`;
      console.log(context);
    }
    // Tambahkan selectedText jika ada
    if (selectedText && selectedText.trim() !== "") {
      prompt += `--- Teks yang Dipilih Pengguna ---\n${selectedText.trim()}\n\n`;
    }
    prompt += `--- Pertanyaan Pengguna ---\n${question}`;
    return prompt;
  }

  async _getGeminiResponse() {
    if (!this.apiKey) {
      this._addMessageToHistoryAndRender(
        "Info: API Key Gemini belum diatur. Silakan atur di Pengaturan Gemini.",
        false
      );
      return null;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const pageContext = this._getCurrentPageContext();
    const selectedText = window.getSelection()
      ? window.getSelection().toString()
      : ""; // Ambil teks yang diseleksi pengguna

    const currentUserPromptMsg = this.chatHistory[this.chatHistory.length - 1];
    if (!currentUserPromptMsg || !currentUserPromptMsg.isUser) {
      console.error(
        "Erzy Tools: Pesan pengguna terakhir tidak ditemukan untuk API call."
      );
      return null;
    }

    const finalUserPromptForApi = this._buildPrompt(
      pageContext,
      currentUserPromptMsg.text,
      selectedText
    );

    const historyForApi = this.chatHistory
      .slice(0, -1)
      .filter(
        (msg) =>
          !(msg.text.startsWith("Error:") || msg.text.startsWith("Info:"))
      )
      .map((msg) => ({
        role: msg.isUser ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

    historyForApi.push({
      role: "user",
      parts: [{ text: finalUserPromptForApi }],
    });

    const payload = { contents: historyForApi };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API Error:", errorData);
        throw new Error(
          `API Error (${response.status}): ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const result = await response.json();

      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        return result.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected API response structure:", result);
        throw new Error(
          "Format respons API tidak valid atau tidak ada konten."
        );
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      this._addMessageToHistoryAndRender(
        `Error: Tidak dapat menghubungi Gemini API. ${error.message}`,
        false
      );
      return null;
    }
  }

  async sendRequest(messageFromUser) {
    if (messageFromUser && messageFromUser.trim() !== "") {
      this._addMessageToHistoryAndRender(messageFromUser, true);
      this.chatInput.value = "";
      this.chatInput.disabled = true;
      this.sendButton.disabled = true;
      this._showLoading(true);

      const botResponse = await this._getGeminiResponse();

      this._showLoading(false);
      this.chatInput.disabled = false;
      this.sendButton.disabled = false;
      this.chatInput.focus();

      if (botResponse) {
        this._addMessageToHistoryAndRender(botResponse, false);
      }
    }
  }

  _setInitialPosition() {
    const savedPosition = localStorage.getItem("erzyChatbotWindowPosition");
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        if (typeof x === "number" && typeof y === "number") {
          this.chatbotWindow.style.left = `${x}px`;
          this.chatbotWindow.style.top = `${y}px`;
          this.chatbotWindow.classList.remove("bottom-5", "right-5");
        } else {
          this._setDefaultPosition();
        }
      } catch (e) {
        console.error("Erzy Tools: Error parsing chatbot window position:", e);
        this._setDefaultPosition();
      }
    } else {
      this._setDefaultPosition();
    }
  }

  _setDefaultPosition() {
    if (!this.chatbotWindow.style.left && !this.chatbotWindow.style.top) {
      // Default ke tengah bawah jika tidak ada posisi tersimpan
      this.chatbotWindow.style.left = `calc(50vw - ${
        this.chatbotWindow.offsetWidth / 2
      }px)`;
      this.chatbotWindow.style.bottom = "20px";
      this.chatbotWindow.style.right = "auto";
      this.chatbotWindow.style.top = "auto";
      // Hapus class posisi absolut lain jika ada
      this.chatbotWindow.classList.remove("bottom-5", "right-5");
    }
  }

  _startDrag(e) {
    this.isDragging = true;
    document.body.classList.add("erzy-dragging"); // Mencegah seleksi teks di body
    this.chatbotWindow.classList.add("erzy-dragging"); // Mencegah seleksi teks di window chatbot

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const rect = this.chatbotWindow.getBoundingClientRect();

    // Pastikan posisi dihitung dari top/left
    this.chatbotWindow.style.left = `${rect.left}px`;
    this.chatbotWindow.style.top = `${rect.top}px`;
    this.chatbotWindow.style.right = "auto";
    this.chatbotWindow.style.bottom = "auto";
    this.chatbotWindow.classList.remove("bottom-5", "right-5"); // Hapus class posisi default

    this.offsetX = clientX - this.chatbotWindow.offsetLeft;
    this.offsetY = clientY - this.chatbotWindow.offsetTop;

    this._onDragHandler = this._onDrag.bind(this);
    this._stopDragHandler = this._stopDrag.bind(this);

    document.addEventListener("mousemove", this._onDragHandler);
    document.addEventListener("mouseup", this._stopDragHandler);
    document.addEventListener("touchmove", this._onDragHandler, {
      passive: false,
    });
    document.addEventListener("touchend", this._stopDragHandler);
    // Disable
    // if (e.type === "touchmove" || e.type === "touchstart") e.preventDefault();
  }

  _onDrag(e) {
    if (!this.isDragging) return;

    // TAMBAHKAN ini: Panggil preventDefault HANYA saat touchmove
    if (e.type === "touchmove") {
      e.preventDefault();
    }

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    let newX = clientX - this.offsetX;
    let newY = clientY - this.offsetY;
    const vpWidth = window.innerWidth,
      vpHeight = window.innerHeight;
    const winWidth = this.chatbotWindow.offsetWidth,
      winHeight = this.chatbotWindow.offsetHeight;
    newX = Math.max(0, Math.min(newX, vpWidth - winWidth));
    newY = Math.max(0, Math.min(newY, vpHeight - winHeight));
    this.chatbotWindow.style.left = `${newX}px`;
    this.chatbotWindow.style.top = `${newY}px`;
    // if (e.type === "touchmove") e.preventDefault();
  }

  _stopDrag() {
    if (!this.isDragging) return;
    this.isDragging = false;
    document.body.classList.remove("erzy-dragging");
    this.chatbotWindow.classList.remove("erzy-dragging");
    localStorage.setItem(
      "erzyChatbotWindowPosition",
      JSON.stringify({
        x: this.chatbotWindow.offsetLeft,
        y: this.chatbotWindow.offsetTop,
      })
    );

    document.removeEventListener("mousemove", this._onDragHandler);
    document.removeEventListener("mouseup", this._stopDragHandler);
    document.removeEventListener("touchmove", this._onDragHandler);
    document.removeEventListener("touchend", this._stopDragHandler);
  }

  _showLoading(show = true) {
    if (this.loadingIndicator) {
      if (show) {
        this.loadingIndicator.classList.remove("hidden");
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      } else {
        this.loadingIndicator.classList.add("hidden");
      }
    }
  }

  _toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.originalWindowHeight =
        this.chatbotWindow.style.height ||
        `${this.chatbotWindow.offsetHeight}px`;
      this.messagesContainer.classList.add("hidden");
      this.inputAreaDiv.classList.add("hidden");
      this.loadingIndicator.classList.add("hidden");
      this.chatbotWindow.style.height = "auto";
      this.minimizeButton.innerHTML = '<i class="fas fa-window-maximize"></i>';
      this.minimizeButton.title = "Maximize";
    } else {
      this.messagesContainer.classList.remove("hidden");
      this.inputAreaDiv.classList.remove("hidden");
      this.chatbotWindow.style.height = this.originalWindowHeight;
      this.minimizeButton.innerHTML = '<i class="fas fa-window-minimize"></i>';
      this.minimizeButton.title = "Minimize";
    }
    console.log(
      `Erzy Tools: Chatbot window ${
        this.isMinimized ? "minimized" : "maximized"
      }`
    );
  }

  _attachEventListeners() {
    if (this.chatForm) {
      this.chatForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const messageText = this.chatInput.value.trim();
        await this.sendRequest(messageText);
      });
    }

    if (this.chatbotHeader) {
      this.chatbotHeader.addEventListener(
        "mousedown",
        this._startDrag.bind(this)
      );
      this.chatbotHeader.addEventListener(
        "touchstart",
        this._startDrag.bind(this),
        { passive: false }
      );
    }

    if (this.closeButton) {
      this.closeButton.addEventListener("click", () => {
        this.chatbotWindow.classList.add("hidden");
        console.log("Erzy Tools: Chatbot window closed");
      });
    }

    if (this.minimizeButton) {
      this.minimizeButton.addEventListener(
        "click",
        this._toggleMinimize.bind(this)
      );
    }

    if (this.resetButton) {
      this.resetButton.addEventListener("click", () => this.clearHistory());
    }

    if (this.settingsButton) {
      this.settingsButton.addEventListener("click", () => {
        const geminiModal = document.getElementById("erzyGeminiSettingsModal"); // ID modal yang spesifik
        if (geminiModal) {
          geminiModal.classList.toggle("hidden");
        } else {
          console.warn(
            'Erzy Tools: Modal Pengaturan Gemini (id="erzyGeminiSettingsModal") tidak ditemukan.'
          );
          this._addMessageToHistoryAndRender(
            "Info: Komponen modal Pengaturan Gemini tidak ditemukan.",
            false
          );
        }
      });
    }
  }

  // Metode untuk mengupdate API Key dan Model jika diubah dari luar (misal dari modal settings)
  updateCredentials(newApiKey, newModel) {
    if (newApiKey) {
      this.apiKey = newApiKey;
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, newApiKey);
      console.log("Erzy Tools: API Key updated.");
    }
    if (newModel) {
      this.model = newModel;
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, newModel);
      console.log("Erzy Tools: Model updated.");
    }
    this._addMessageToHistoryAndRender(
      "Info: Pengaturan Gemini telah diperbarui.",
      false
    );
  }
}
class ToolsButton {
  /**
   * Creates a new button element and appends it to a parent.
   * @param {string} name - The text content of the button.
   * @param {function} onClickFunction - The function to call when the button is clicked.
   * @param {HTMLElement } [parent=elements[ids.toolsContainerElement]] - The parent element to append the button to.
   * @param {string} [customClasses=""] - Optional custom Tailwind CSS classes to apply.
   */
  constructor(
    name,
    onClickFunction,
    parent = elements[ids.toolsContainerElement],
    customClasses = ""
  ) {
    this.element = document.createElement("button");
    this.element.textContent = name;
    this.element.className =
      customClasses ||
      "tools-button w-36 border-2 text-wrap text-center p-2 rounded-md shadow-md transition-transform duration-200 ease-in-out cursor-pointer";
    this.element.addEventListener("click", onClickFunction);
    parent.appendChild(this.element);
  }

  /**
   * Gets the underlying HTMLElement of the button.
   * @returns {HTMLButtonElement} The button's DOM element.
   */
  get domElement() {
    return this.element;
  }

  /**
   * Sets the text content of the button.
   * @param {string} newText - The new text for the button.
   */
  setText(newText) {
    this.element.textContent = newText;
  }

  /**
   * Adds CSS classes to the button.
   * @param {string} classes - Space-separated class names to add.
   */
  addClasses(classes) {
    this.element.classList.add(...classes.split(" "));
  }

  /**
   * Removes CSS classes from the button.
   * @param {string} classes - Space-separated class names to remove.
   */
  removeClasses(classes) {
    this.element.classList.remove(...classes.split(" "));
  }

  /**
   * Disables the button.
   */
  disable() {
    this.element.disabled = true;
    this.element.classList.add("opacity-50", "cursor-not-allowed");
    this.element.classList.remove("tools-button");
  }

  /**
   * Enables the button.
   */
  enable() {
    this.element.disabled = false;
    this.element.classList.remove("opacity-50", "cursor-not-allowed");
    this.element.classList.add("tools-button");
  }
}

// Function to add Tailwind CSS and its configuration (already exists)
function addTailwind() {
  // Check if the Tailwind CDN script already exists
  const cdnScriptExists = document.querySelector(
    'link[href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.15/dist/tailwind.min.css"]'
  );

  // If the CDN script doesn't exist, create and add it
  if (!cdnScriptExists) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.15/dist/tailwind.min.css";
    document.head.appendChild(link);
    // console.log("Tailwind CDN script added.");
  } else {
    console.log("Tailwind CDN script already exists.");
  }
}

// Function to add FontAwesome CSS
function addFontAwesomeLink() {
  const linkId = "fontAwesomeCdnLink";
  if (document.getElementById(linkId)) {
    console.log("FontAwesome link already exists.");
    return;
  }
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
  document.head.appendChild(link);
  // console.log("FontAwesome link added.");
}

// Function for "Done" notification
function done(message = "Done!") {
  const notificationId = "erzyDoneNotification";
  let notification = document.getElementById(notificationId);
  if (notification) {
    notification.remove();
  }

  notification = document.createElement("div");
  notification.id = notificationId;
  notification.textContent = message;
  notification.className =
    "fixed top-0 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold font-mono py-2 px-4 rounded shadow-md z-[100001] transition-all duration-300 ease-out opacity-0";
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove("opacity-0", "top-0");
    notification.classList.add("opacity-100", "top-5");
  }, 100);

  setTimeout(() => {
    notification.classList.remove("opacity-100", "top-5");
    notification.classList.add("opacity-0", "top-0");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// == ERZY TOOLS ==

// --- Chatbot CSS Injection ---
function injectChatbotStyles() {
  const styleId = "erzyChatbotStyles";
  if (document.getElementById(styleId)) return;

  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = `
        /* Custom scrollbar */
        .erzy-chatbot-messages::-webkit-scrollbar { width: 8px; }
        .erzy-chatbot-messages::-webkit-scrollbar-track { background: #f1f1f1; }
        .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        .erzy-chatbot-messages::-webkit-scrollbar-thumb:hover { background: #555; }
        .dark .erzy-chatbot-messages::-webkit-scrollbar-track { background: #4b5563; } /* bg-gray-600 */
        .dark .erzy-chatbot-messages::-webkit-scrollbar-thumb { background: #6b7280; } /* bg-gray-500 */
        .dark .erzy-chatbot-messages::-webkit-scrollbar-thumb:hover { background: #9ca3af; } /* bg-gray-400 */
        .erzy-dragging, .erzy-dragging * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
        }
        /* Pastikan window chatbot bisa di-override oleh tema dark mode halaman */
        .dark #erzyChatbotWindow {
            background-color: #1f2937; /* bg-gray-800 */
            border-color: #374151; /* border-gray-700 */
        }
        .dark #erzyChatbotHeader {
            background-color: #374151; /* bg-gray-700 */
            border-color: #4b5563; /* border-gray-600 */
        }
        .dark #erzyChatbotHeader h2, .dark #erzyChatbotHeader button { color: #f3f4f6; /* text-gray-100 */ }
        .dark #erzyChatbotHeader button:hover { color: #d1d5db; /* text-gray-300 */ }
        .dark #erzyChatbotMessages { background-color: #1f2937; /* bg-gray-800 */ }
        .dark #erzyChatbotInputArea {
            background-color: #374151; /* bg-gray-700 */
            border-color: #4b5563; /* border-gray-600 */
        }
        .dark #erzyChatbotInput {
            background-color: #1f2937; /* bg-gray-800 */
            border-color: #4b5563; /* border-gray-500 */
            color: #f9fafb; /* text-gray-100 */
        }
        .dark #erzyChatbotInput::placeholder { color: #6b7280; /* placeholder-gray-500 */ }
    `;
  document.head.appendChild(styleElement);
}

// --- Chatbot UI ---
function createChatbotUI() {
  const chatbotWindow = document.createElement("div");
  chatbotWindow.id = "erzyChatbotWindow";
  // Default class, posisi akan diatur oleh _setInitialPosition
  chatbotWindow.className =
    "fixed w-full max-w-md h-[600px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-300 dark:border-gray-700 z-[99999] hidden"; // Z-index tinggi

  // Header
  const chatbotHeader = document.createElement("div");
  chatbotHeader.id = "erzyChatbotHeader";
  chatbotHeader.className =
    "bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200 cursor-move";
  chatbotHeader.innerHTML = `
        <h2 class="font-semibold text-lg text-gray-800">
            <i class="fas fa-robot mr-2 text-blue-500"></i>Gemini AI ✨
        </h2>
        <div class="space-x-2">
             <button id="erzyChatbotSettingsButton" title="Pengaturan Gemini" class="p-2 text-gray-600 hover:text-blue-500 focus:outline-none">
                <i class="fas fa-cog"></i>
            </button>
            <button id="erzyChatbotResetButton" title="Reset Chat" class="p-2 text-gray-600 hover:text-yellow-500 focus:outline-none">
                <i class="fas fa-sync-alt"></i>
            </button>
            <button id="erzyChatbotMinimizeButton" title="Minimize" class="p-2 text-gray-600 hover:text-gray-800 focus:outline-none">
                <i class="fas fa-window-minimize"></i>
            </button>
            <button id="erzyChatbotCloseButton" title="Tutup" class="p-2 text-gray-600 hover:text-red-500 focus:outline-none">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  // Messages Container
  const messagesContainer = document.createElement("div");
  messagesContainer.id = "erzyChatbotMessages";
  messagesContainer.className =
    "flex-grow p-4 space-y-4 overflow-y-auto erzy-chatbot-messages bg-white";

  // Loading Indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "erzyChatbotLoadingIndicator";
  loadingIndicator.className = "hidden flex justify-start group p-4"; // Awalnya hidden
  loadingIndicator.innerHTML = `
        <div class="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-[80%] shadow">
            <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-300"></div>
                <span class="text-sm italic">Bot sedang mengetik...</span>
            </div>
        </div>
    `;

  // Input Area
  const inputAreaDiv = document.createElement("div");
  inputAreaDiv.id = "erzyChatbotInputArea";
  inputAreaDiv.className = "bg-gray-100 p-3 border-t border-gray-200";
  inputAreaDiv.innerHTML = `
        <form id="erzyChatbotForm" class="flex items-center space-x-2">
            <input type="text" id="erzyChatbotInput" placeholder="Ketik pesanmu di sini..." class="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none" autocomplete="off">
            <button type="submit" id="erzyChatbotSendButton" title="Kirim Pesan ✨" class="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150">
                <i class="fas fa-paper-plane"></i>
            </button>
        </form>
    `;

  chatbotWindow.appendChild(chatbotHeader);
  chatbotWindow.appendChild(messagesContainer);
  chatbotWindow.appendChild(loadingIndicator); // Pastikan loading indicator ada di dalam window
  chatbotWindow.appendChild(inputAreaDiv);
  document.body.appendChild(chatbotWindow);

  return {
    chatbotWindow,
    chatbotHeader,
    messagesContainer,
    chatForm: inputAreaDiv.querySelector("#erzyChatbotForm"),
    chatInput: inputAreaDiv.querySelector("#erzyChatbotInput"),
    sendButton: inputAreaDiv.querySelector("#erzyChatbotSendButton"),
    loadingIndicator,
    resetButton: chatbotHeader.querySelector("#erzyChatbotResetButton"),
    settingsButton: chatbotHeader.querySelector("#erzyChatbotSettingsButton"),
    minimizeButton: chatbotHeader.querySelector("#erzyChatbotMinimizeButton"),
    closeButton: chatbotHeader.querySelector("#erzyChatbotCloseButton"),
    inputAreaDiv,
  };
}

// --- Chatbot Initialization ---
function initializeErzyChatbot() {
  ensureGeminiSettingsModal();
  // Cek apakah Font Awesome sudah ada, jika belum, tambahkan
  if (!document.querySelector('link[href*="fontawesome"]')) {
    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
    document.head.appendChild(faLink);
  }
  // Cek apakah Tailwind sudah ada (minimal deteksi sederhana), jika belum, tambahkan
  // Ini mungkin tidak ideal karena bisa konflik, tapi untuk bookmarklet sederhana bisa dicoba
  if (
    !document.querySelector('link[href*="tailwind"]') &&
    !document.querySelector('script[src*="cdn.tailwindcss.com"]')
  ) {
    const tailwindScript = document.createElement("script");
    tailwindScript.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(tailwindScript);
    // Mungkin perlu menunggu Tailwind selesai load sebelum UI dibuat, tapi untuk simplisitas kita lanjut dulu
  }

  if (document.getElementById("erzyChatbotWindow")) {
    console.log("Erzy Tools: Chatbot is already running.");
    const existingChatbotWindow = document.getElementById("erzyChatbotWindow");
    existingChatbotWindow.style.display = "flex"; // Tampilkan jika tersembunyi
    return; // Hindari membuat instance baru
  }

  injectChatbotStyles();
  const domElements = createChatbotUI();

  const initialModel = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
  const initialApiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);

  // Buat instance ChatBot dan simpan di window agar bisa diakses jika perlu (misal dari modal settings)
  window.erzyChatbotInstance = new ChatBot(
    initialModel,
    initialApiKey,
    domElements
  );

  console.log("Erzy Tools: Chatbot initialized.");
}

// --- Gemini Settings Modal ---
function ensureGeminiSettingsModal() {
  if (!document.getElementById("erzyGeminiSettingsModal")) {
    const modalHTML = `
            <div id="erzyGeminiSettingsModal" class="fixed inset-0 bg-gray-800 bg-opacity-75 flex hidden justify-center items-center p-4 sm:p-10 font-mono text-gray-300 overflow-y-auto z-[100000]">
                <div class="bg-gray-900 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="text-2xl font-semibold text-gray-100">Pengaturan Gemini</h1>
                        <button id="erzyCloseSettingsModal" class="text-gray-400 hover:text-gray-200">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <hr class="border-t border-gray-700 my-4" />
                    <form id="erzyGeminiSettingsForm">
                        <div class="mb-6">
                            <label for="erzyModalApiKey" class="block text-sm font-medium text-gray-400 mb-1">API Key</label>
                            <input type="password" id="erzyModalApiKey" name="geminiApiKey" required class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder-gray-500">
                            <p class="text-xs text-gray-500 mt-2">
                                Dapatkan API Key dari Google AI Studio. 
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">Buat API Key di sini</a>.
                            </p>
                        </div>
                        <div class="mb-6">
                            <label for="erzyModalModelSelect" class="block text-sm font-medium text-gray-400 mb-1">Model Gemini:</label>
                            <select id="erzyModalModelSelect" name="modelSelect" class="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200">
                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash Preview 05-20</option>
                                <option value="gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro Preview 05-06</option>
                                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                                <option value="gemma-3n-e4b-it">Gemma 3N E4B IT</option>
                                <option value="gemma-3-27b-it">Gemma 3 27B IT</option>
                            </select>
                        </div>
                        <div class="flex justify-end space-x-3 mt-8">
                            <button type="button" id="erzyResetSettingsModal" class="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold rounded-md">Reset</button>
                            <button type="submit" class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Event listener untuk modal
    const settingsModal = document.getElementById("erzyGeminiSettingsModal");
    const closeSettingsButton = document.getElementById(
      "erzyCloseSettingsModal"
    );
    const settingsForm = document.getElementById("erzyGeminiSettingsForm");
    const apiKeyInput = document.getElementById("erzyModalApiKey");
    const modelSelectInput = document.getElementById("erzyModalModelSelect");
    const resetSettingsButton = document.getElementById(
      "erzyResetSettingsModal"
    );

    if (closeSettingsButton) {
      closeSettingsButton.onclick = () => settingsModal.classList.add("hidden");
    }
    if (settingsForm) {
      // Isi form dengan nilai dari localStorage saat modal dibuka (jika perlu, atau saat tombol settings di klik)
      apiKeyInput.value =
        localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || "";
      modelSelectInput.value =
        localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;

      settingsForm.onsubmit = (e) => {
        e.preventDefault();
        const newApiKey = apiKeyInput.value.trim();
        const newModel = modelSelectInput.value;
        if (window.erzyChatbotInstance) {
          window.erzyChatbotInstance.updateCredentials(newApiKey, newModel);
        } else {
          // Fallback jika instance belum ada (seharusnya tidak terjadi)
          localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, newApiKey);
          localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, newModel);
        }
        settingsModal.classList.add("hidden");
        if (window.erzyChatbotInstance) {
          // Beri notifikasi di chat
          window.erzyChatbotInstance._addMessageToHistoryAndRender(
            "Info: Pengaturan Gemini telah disimpan.",
            false
          );
        }
      };
    }
    if (resetSettingsButton) {
      resetSettingsButton.onclick = () => {
        apiKeyInput.value = PROVIDED_API_KEY; // Reset ke API Key default yang kamu berikan
        modelSelectInput.value = DEFAULT_GEMINI_MODEL;
        // Tidak langsung simpan, biarkan user klik "Simpan"
      };
    }
    // Tutup modal jika klik di luar area konten modal
    if (settingsModal) {
      settingsModal.addEventListener("click", function (event) {
        if (event.target === settingsModal) {
          // Hanya jika klik pada backdrop, bukan konten modal
          settingsModal.classList.add("hidden");
        }
      });
    }
  }
}

// --- Page Menu & Gear Icon CSS Injection ---
function injectPageMenuStyles() {
  const styleId = "erzyPageMenuStyles";
  if (document.getElementById(styleId)) return;

  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = `
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
            background-color: rgba(31, 41, 55, 0.85); /* bg-gray-800 dengan opacity */
            border-color: #4b5563; /* border-gray-600 */
        }
        .dark #erzyPageMenu h1 { color: #f3f4f6; /* text-gray-100 */ }
        
        #erzyPageMenuGearIcon {
            /* Style Tailwind sudah cukup, bisa ditambahkan override di sini jika perlu */
        }
        .erzy-dragging, .erzy-dragging * { /* Untuk gear icon drag */
            user-select: none !important; -webkit-user-select: none !important;
            -moz-user-select: none !important; -ms-user-select: none !important;
        }
    `;
  document.head.appendChild(styleElement);
}

// --- Page Menu UI ---
function ensurePageMenu() {
  const menuId = "erzyPageMenu";
  let pageMenu = document.getElementById(menuId);
  if (pageMenu) return pageMenu;

  pageMenu = document.createElement("div");
  pageMenu.id = menuId;
  pageMenu.className =
    "fixed p-3 flex flex-col rounded-t-2xl left-0 min-w-full right-0 min-h-40 border-2 border-gray-700 bg-gray-800 backdrop-blur-md bg-opacity-30 duration-500 ease-out z-[99998]";
  pageMenu.style.fontFamily = "monospace";

  pageMenu.innerHTML = `
        <div class="flex justify-center mb-2">
            <h1 class="text-xl text-gray-100">Erzy.sh Tools</h1>
        </div>
        <div id="erzyToolsContainer" class="p-5 flex flex-wrap justify-center items-start gap-5 overflow-y-auto max-h-[calc(100vh-12rem)] text-gray-100">
            </div>
    `;
  document.body.appendChild(pageMenu);
  return pageMenu;
}

// --- Gear Icon UI ---
function addFixedGearIcon() {
  const gearIconId = "erzyPageMenuGearIcon";
  if (document.getElementById(gearIconId)) return;

  const pageMenu = document.getElementById("erzyPageMenu");
  if (!pageMenu) {
    console.warn(
      "Erzy Tools: Page Menu not found for gear icon. Pastikan ensurePageMenu() dipanggil dulu."
    );
    return;
  }

  const gearIcon = document.createElement("div");
  gearIcon.id = gearIconId;
  gearIcon.className =
    "fixed bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer z-[99999] w-14 h-14 text-2xl hover:bg-gray-100 active:scale-90 transition-transform duration-100 ease-in-out";
  gearIcon.innerHTML =
    '<i class="fas fa-wrench text-gray-700 dark:text-gray-200"></i>';
  gearIcon.title = "Buka Menu Tools";

  gearIcon.addEventListener("click", () => {
    pageMenu.classList.toggle("erzy-menu-visible");
    gearIcon.title = pageMenu.classList.contains("erzy-menu-visible")
      ? "Tutup Menu Tools"
      : "Buka Menu Tools";
  });

  let isDraggingGear = false;
  let gearDragOffsetX, gearDragOffsetY;

  const savedPosition = localStorage.getItem(PAGE_MENU_GEAR_ICON_POSITION_KEY);
  if (savedPosition) {
    try {
      const { x, y } = JSON.parse(savedPosition);
      gearIcon.style.right = "auto";
      gearIcon.style.bottom = "auto";
      gearIcon.style.left = `${x}px`;
      gearIcon.style.top = `${y}px`;
    } catch (e) {
      gearIcon.style.right = "20px";
      gearIcon.style.bottom = "20px";
    }
  } else {
    gearIcon.style.right = "20px";
    gearIcon.style.bottom = "20px";
  }

  const startGearDrag = (e) => {
    isDraggingGear = true;
    document.body.classList.add("erzy-dragging");
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const rect = gearIcon.getBoundingClientRect();
    gearIcon.style.left = `${rect.left}px`;
    gearIcon.style.top = `${rect.top}px`;
    gearIcon.style.right = "auto";
    gearIcon.style.bottom = "auto";
    gearDragOffsetX = clientX - gearIcon.offsetLeft;
    gearDragOffsetY = clientY - gearIcon.offsetTop;
    gearIcon.style.cursor = "grabbing";
    // if (e.type === "touchstart") e.preventDefault();
  };
  const onGearDrag = (e) => {
    if (!isDraggingGear) return;

    // TAMBAHKAN ini: Panggil preventDefault HANYA saat touchmove
    if (e.type === "touchmove") {
      e.preventDefault();
    }

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    let newX = clientX - gearDragOffsetX;
    let newY = clientY - gearDragOffsetY;
    const vpWidth = window.innerWidth,
      vpHeight = window.innerHeight;
    const iconWidth = gearIcon.offsetWidth,
      iconHeight = gearIcon.offsetHeight;
    newX = Math.max(0, Math.min(newX, vpWidth - iconWidth));
    newY = Math.max(0, Math.min(newY, vpHeight - iconHeight));
    gearIcon.style.left = `${newX}px`;
    gearIcon.style.top = `${newY}px`;
    // if (e.type === "touchmove") e.preventDefault();
  };
  const stopGearDrag = () => {
    if (!isDraggingGear) return;
    isDraggingGear = false;
    document.body.classList.remove("erzy-dragging");
    gearIcon.style.cursor = "pointer";
    localStorage.setItem(
      PAGE_MENU_GEAR_ICON_POSITION_KEY,
      JSON.stringify({ x: gearIcon.offsetLeft, y: gearIcon.offsetTop })
    );
  };

  gearIcon.addEventListener("mousedown", startGearDrag);
  gearIcon.addEventListener("touchstart", startGearDrag, { passive: false });
  document.addEventListener("mousemove", onGearDrag);
  document.addEventListener("touchmove", onGearDrag, { passive: false });
  document.addEventListener("mouseup", stopGearDrag);
  document.addEventListener("touchend", stopGearDrag);

  document.body.appendChild(gearIcon);
  return gearIcon; // Kembalikan elemen gear icon
}

// --- Page Menu Initialization ---
function initializeErzyPageMenu() {
  if (window.erzyPageMenuInitialized) {
    console.log("Erzy Tools: Page Menu is already initialized.");
    return;
  }
  injectPageMenuStyles();
  const menuElement = ensurePageMenu();
  const gearIconElement = addFixedGearIcon();

  window.erzyPageMenuInitialized = true;
  console.log("Erzy Tools: Page Menu initialized.");
  return { menuElement, gearIconElement, toolsContainer };
}

function initialize() {
  addTailwind();
  addFontAwesomeLink();
  initializeErzyPageMenu();
  initializeErzyChatbot();

  for (const id in ids) {
    /**
     * @type {HTMLElement}
     */
    elements[ids[id]] = document.querySelector(ids[id]);
  }

  const tools = {
    makeAllSelectable: new ToolsButton("Make All Selectable", function () {
      console.log("makeAllSelectable");
    }),
    jsEval: new ToolsButton("JavaScript Evaluator", function () {
      const input = prompt("Enter JS code to evaluate:");
      try {
        const result = eval(input);
        done(result);
      } catch (error) {
        done(error);
        console.error(error);
      }
    }),
    openGemini: new ToolsButton("Open Gemini", function () {
      const chatbotWindow = elements[ids.erzyChatbotWindow];
      if (!chatbotWindow) return console.log("Chatbot window not found.");
      const isHidden = chatbotWindow.classList.contains("hidden");
      done("Chatbot " + (isHidden ? "shown" : "hidden"));
      chatbotWindow.classList.toggle("hidden");
    }),
  };
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}
