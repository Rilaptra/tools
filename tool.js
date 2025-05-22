// Function to add Tailwind CSS and its configuration (already exists)
function addTailwind() {
  // Check if the Tailwind config script already exists
  let configScriptExists = false;
  const headScripts = document.head.getElementsByTagName('script');
  for (let i = 0; i < headScripts.length; i++) {
    if (headScripts[i].innerHTML.includes('tailwind.config')) {
      configScriptExists = true;
      break;
    }
  }

  // If the config script doesn't exist, create and add it
  if (!configScriptExists) {
    const twConfigScript = document.createElement('script');
    twConfigScript.innerHTML = 'tailwind.config = {};'; // Basic empty config
    document.head.appendChild(twConfigScript);
    console.log('Tailwind config script added.');
  } else {
    console.log('Tailwind config script already exists.');
  }

  // Check if the Tailwind CDN script already exists
  let cdnScriptExists = false;
  for (let i = 0; i < headScripts.length; i++) {
    if (headScripts[i].src === 'https://cdn.tailwindcss.com') {
      cdnScriptExists = true;
      break;
    }
  }

  // If the CDN script doesn't exist, create and add it
  if (!cdnScriptExists) {
    const twCdnScript = document.createElement('script');
    twCdnScript.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(twCdnScript);
    console.log('Tailwind CDN script added.');
  } else {
    console.log('Tailwind CDN script already exists.');
  }
}
addTailwind(); // Call existing function

// Function to add FontAwesome CSS
function addFontAwesomeLink() {
  const linkId = 'fontAwesomeCdnLink';
  if (document.getElementById(linkId)) {
    console.log('FontAwesome link already exists.');
    return;
  }
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
  document.head.appendChild(link);
  console.log('FontAwesome link added.');
}

// Function for "Done" notification
function done(message = 'Done!') { // Allow custom messages
  const notificationId = 'erzyDoneNotification'; 
  let notification = document.getElementById(notificationId);
  if (notification) { 
    notification.remove();
  }

  notification = document.createElement('div');
  notification.id = notificationId;
  notification.textContent = message;
  notification.className = 'fixed top-0 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold font-mono py-2 px-4 rounded shadow-md z-[100001] transition-all duration-300 ease-out opacity-0'; // z-index to be above Gemini panel
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove('opacity-0', 'top-0');
    notification.classList.add('opacity-100', 'top-5');
  }, 100); 

  setTimeout(() => {
    notification.classList.remove('opacity-100', 'top-5');
    notification.classList.add('opacity-0', 'top-0'); 
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300); 
  }, 3000);
}

// Function to create a new button
function newButton(name, parent, onClickFunction, customClasses = '') {
  const button = document.createElement('button');
  button.textContent = name;
  button.className = customClasses || 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-mono py-2 px-4 border border-gray-400 rounded shadow active:shadow-inner active:bg-gray-400 transform active:scale-95 transition-transform duration-100 ease-in-out';
  button.addEventListener('click', onClickFunction);
  parent.appendChild(button);
  return button;
}

// --- Gemini Chat Helper Functions ---

const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';

// Function to save API key to localStorage
function saveApiKey(apiKeyStatusElement) {
    const apiKeyInput = document.getElementById('geminiApiKeyInput');
    if (!apiKeyInput) {
        console.error('API Key input field not found!');
        if (apiKeyStatusElement) apiKeyStatusElement.textContent = 'Error: Input field missing.';
        return;
    }
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey);
        apiKeyInput.value = ''; // Clear for security
        if (apiKeyStatusElement) {
            apiKeyStatusElement.textContent = `API Key saved (ending ...${apiKey.slice(-4)})`;
            apiKeyStatusElement.className = 'text-xs font-mono text-green-600 mt-1';
        }
        done('API Key saved successfully!');
    } else {
        if (apiKeyStatusElement) {
            apiKeyStatusElement.textContent = 'Please enter an API Key.';
            apiKeyStatusElement.className = 'text-xs font-mono text-red-600 mt-1';
        }
    }
}

// Function to load API key from localStorage
function loadApiKey() {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
}

// Function to update API key status display
function updateApiKeyStatusDisplay(apiKeyStatusElement) {
    if (!apiKeyStatusElement) return;
    const apiKey = loadApiKey();
    if (apiKey) {
        apiKeyStatusElement.textContent = `Key set (ends ...${apiKey.slice(-4)})`;
        apiKeyStatusElement.className = 'text-xs font-mono text-gray-600 mt-1';
    } else {
        apiKeyStatusElement.textContent = 'No API Key set.';
        apiKeyStatusElement.className = 'text-xs font-mono text-gray-600 mt-1';
    }
}


// Function to display a message in the Gemini chat UI
function displayMessage(message, role) {
    const chatDisplay = document.getElementById('geminiChatDisplay');
    if (!chatDisplay) {
        console.error('Gemini chat display area not found!');
        return;
    }

    if (chatDisplay.innerHTML.includes('Chat messages will appear here...')) {
        chatDisplay.innerHTML = ''; 
    }

    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'flex w-full mb-2';

    const messageEl = document.createElement('div');
    // Sanitize message text before setting (basic sanitization)
    const textNode = document.createTextNode(message);
    messageEl.appendChild(textNode);
    messageEl.className = 'p-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg font-mono text-sm break-words shadow';

    switch (role) {
        case 'user':
            messageEl.className += ' bg-blue-500 text-white';
            messageWrapper.classList.add('justify-end');
            break;
        case 'assistant':
            messageEl.className += ' bg-gray-200 text-gray-800';
            messageWrapper.classList.add('justify-start');
            break;
        case 'error':
            messageEl.className += ' bg-red-500 text-white';
            messageWrapper.classList.add('justify-start');
            break;
        default:
            messageEl.className += ' bg-gray-500 text-white';
            messageWrapper.classList.add('justify-start');
    }
    
    messageWrapper.appendChild(messageEl);
    chatDisplay.appendChild(messageWrapper);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Asynchronous function to (mock) call Gemini API
async function callGeminiAPI(prompt, model) {
    const apiKey = loadApiKey();
    if (!apiKey) {
        return { success: false, error: "API Key not set. Please save your API key in the Gemini Chat panel." };
    }

    console.log(`Calling mock Gemini API with model: ${model}, prompt: "${prompt}", Key: ...${apiKey.slice(-4)}`);
    return new Promise(resolve => {
        setTimeout(() => {
            if (!prompt || prompt.trim().length < 5) {
                resolve({ success: false, error: "Prompt is too short. Please provide more details." });
            } else {
                resolve({ 
                    success: true, 
                    text: `(Mock response for model "${model}"): You asked about "${prompt.substring(0, 50)}..." using key ending ...${apiKey.slice(-4)}. This is a simulated answer.` 
                });
            }
        }, 1000 + Math.random() * 1000);
    });
}

// --- End Gemini Chat Helper Functions ---


// Function to create the Gemini Chat UI
let geminiChatPanelElement = null;
function addGeminiChatUI() {
    const panelId = 'erzyGeminiChatPanel';
    if (document.getElementById(panelId)) {
        geminiChatPanelElement = document.getElementById(panelId);
        // Update API key status if UI already exists
        const apiKeyStatusElement = document.getElementById('geminiApiKeyStatus');
        if (apiKeyStatusElement) updateApiKeyStatusDisplay(apiKeyStatusElement);
        console.log('Gemini Chat UI already exists and API status updated.');
        return geminiChatPanelElement;
    }

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'fixed top-0 right-0 h-full w-full md:w-1/3 bg-white shadow-xl z-[100000] p-6 flex flex-col transform translate-x-full transition-transform duration-300 ease-in-out';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4 pb-2 border-b border-gray-300';
    const title = document.createElement('h2');
    title.textContent = 'Gemini AI Chat';
    title.className = 'text-xl font-semibold font-mono text-gray-800';
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'text-gray-600 hover:text-gray-900 text-2xl font-bold';
    closeButton.onclick = () => {
        panel.classList.add('translate-x-full');
    };
    header.appendChild(title);
    header.appendChild(closeButton);
    panel.appendChild(header);

    // --- API Key Section ---
    const apiKeySection = document.createElement('div');
    apiKeySection.className = 'mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md';
    
    const apiKeyLabel = document.createElement('label');
    apiKeyLabel.textContent = 'Gemini API Key:';
    apiKeyLabel.htmlFor = 'geminiApiKeyInput';
    apiKeyLabel.className = 'block text-sm font-medium text-gray-700 mb-1 font-mono';
    apiKeySection.appendChild(apiKeyLabel);

    const apiKeyInputContainer = document.createElement('div');
    apiKeyInputContainer.className = 'flex items-center space-x-2 mb-1';
    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.id = 'geminiApiKeyInput';
    apiKeyInput.placeholder = 'Enter your API Key';
    apiKeyInput.className = 'flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm';
    apiKeyInputContainer.appendChild(apiKeyInput);

    const saveApiKeyButton = newButton('Save', apiKeyInputContainer, null, 'bg-green-500 hover:bg-green-600 text-white font-mono text-sm py-2 px-3 rounded-md shadow');
    apiKeySection.appendChild(apiKeyInputContainer);
    
    const apiKeyStatus = document.createElement('p');
    apiKeyStatus.id = 'geminiApiKeyStatus';
    apiKeyStatus.className = 'text-xs font-mono text-gray-600 mt-1';
    apiKeySection.appendChild(apiKeyStatus);
    
    // Set click listener for save button AFTER status element is defined
    saveApiKeyButton.onclick = () => saveApiKey(apiKeyStatus);

    panel.appendChild(apiKeySection);
    // --- End API Key Section ---


    const modelSelectLabel = document.createElement('label');
    modelSelectLabel.textContent = 'Select Model:';
    modelSelectLabel.className = 'block text-sm font-medium text-gray-700 mb-1 font-mono';
    panel.appendChild(modelSelectLabel);
    const modelSelect = document.createElement('select');
    modelSelect.id = 'geminiModelSelect'; 
    modelSelect.className = 'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-4 font-mono text-sm';
    const models = [
        { name: "Gemma (Free)", value: "gemma-free" },
        { name: "Gemini 2.0 Flash (Free)", value: "gemini-2.0-flash-free" },
        { name: "Gemini 2.0 Pro (Free)", value: "gemini-2.0-pro-free" },
        { name: "Gemini 2.5 Flash (Free)", value: "gemini-2.5-flash-free" },
        { name: "Gemini 2.5 Pro (Free)", value: "gemini-2.5-pro-free" }
    ];
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.name;
        modelSelect.appendChild(option);
    });
    panel.appendChild(modelSelect);
    
    const chatDisplay = document.createElement('div');
    chatDisplay.id = 'geminiChatDisplay';
    chatDisplay.className = 'flex-grow bg-gray-50 p-3 h-64 rounded-md overflow-y-auto mb-4 border border-gray-200 min-h-[200px] flex flex-col space-y-2';
    chatDisplay.innerHTML = '<div class="text-gray-500 text-sm font-mono text-center p-4">Chat messages will appear here...</div>';
    panel.appendChild(chatDisplay);

    const promptInput = document.createElement('textarea');
    promptInput.id = 'geminiPromptInput';
    promptInput.placeholder = 'Type your message to Gemini... (min 5 chars)';
    promptInput.rows = 3;
    promptInput.className = 'w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-4 font-mono text-sm';
    panel.appendChild(promptInput);

    const sendButton = newButton('Send', panel, async () => { 
        const currentPrompt = promptInput.value.trim();
        const selectedModel = document.getElementById('geminiModelSelect').value;

        if (!currentPrompt) {
            displayMessage("Please enter a message.", "error");
            return;
        }
        
        promptInput.value = ''; 
        displayMessage(currentPrompt, 'user');

        const thinkingMsgId = 'thinking-' + Date.now();
        displayMessage('Thinking...', 'assistant');
        let thinkingMsgElement = document.getElementById('geminiChatDisplay').lastChild.lastChild; 
        if (thinkingMsgElement) thinkingMsgElement.id = thinkingMsgId;

        const response = await callGeminiAPI(currentPrompt, selectedModel);

        const thinkingElementToRemove = document.getElementById(thinkingMsgId);
        if (thinkingElementToRemove && thinkingElementToRemove.parentNode) {
             thinkingElementToRemove.parentNode.remove();
        }

        if (response.success) {
            displayMessage(response.text, 'assistant');
        } else {
            displayMessage(response.error || "An unknown error occurred.", 'error');
        }
    }, 'w-full bg-blue-500 hover:bg-blue-600 text-white font-mono font-semibold py-2 px-4 rounded-md shadow active:bg-blue-700 transform active:scale-95 transition-transform duration-100 ease-in-out');
    
    document.body.appendChild(panel);
    geminiChatPanelElement = panel;
    
    // Initial API Key status update
    updateApiKeyStatusDisplay(apiKeyStatus);

    return panel;
}


// Function to create the page menu
let pageMenuElement = null; 
function addPageMenu() {
  const menuId = 'erzyToolsPageMenu';
  if (document.getElementById(menuId)) {
    pageMenuElement = document.getElementById(menuId);
    if (!document.getElementById('erzyGeminiChatButton')) {
        const buttonContainer = pageMenuElement.querySelector('.grid'); 
        if (buttonContainer) {
             newButton("Gemini Chat", buttonContainer, () => {
                if (geminiChatPanelElement) {
                    geminiChatPanelElement.classList.remove('translate-x-full'); 
                    // When opening Gemini Chat, refresh API key status
                    const apiKeyStatusElement = document.getElementById('geminiApiKeyStatus');
                    if (apiKeyStatusElement) updateApiKeyStatusDisplay(apiKeyStatusElement);
                } else {
                    console.error("Gemini Chat UI not initialized yet!");
                }
            }, '').id = 'erzyGeminiChatButton'; 
        }
    }
    console.log('Page menu already exists or updated.');
    return pageMenuElement;
  }

  const menu = document.createElement('div');
  menu.id = menuId;
  menu.className = 'fixed bottom-0 left-0 w-full bg-gray-100 border-t-2 border-gray-300 shadow-lg z-[99998] p-5 transform transition-transform duration-300 ease-in-out translate-y-full';
  
  const title = document.createElement('h2');
  title.className = 'text-xl font-mono font-bold text-center mb-4 text-gray-700';
  title.textContent = 'TOOLS by Erzy.sh';
  menu.appendChild(title);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  menu.appendChild(buttonContainer);

  newButton("Make All Blockable", buttonContainer, () => {
    document.querySelectorAll("*").forEach(el => {
      if (el.style) el.style.userSelect = "auto";
    });
    done();
  });

  newButton("JS Executor", buttonContainer, () => {
    try {
      const code = prompt("Enter JavaScript code to execute:");
      if (code === null) return; 
      if (code.trim() === "") {
        done(); 
        return;
      }
      const result = eval(code);
      if (result !== undefined) {
        alert("Result: " + result);
      } else {
        done();
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  });

  newButton("Gemini Chat", buttonContainer, () => {
    if (geminiChatPanelElement) {
        geminiChatPanelElement.classList.remove('translate-x-full'); 
        const apiKeyStatusElement = document.getElementById('geminiApiKeyStatus');
        if (apiKeyStatusElement) updateApiKeyStatusDisplay(apiKeyStatusElement);
    } else {
        console.error("Gemini Chat UI not initialized yet! Forcing creation.");
        addGeminiChatUI(); 
        if(geminiChatPanelElement) geminiChatPanelElement.classList.remove('translate-x-full');
    }
  }, '').id = 'erzyGeminiChatButton'; 
  
  document.body.appendChild(menu);
  pageMenuElement = menu; 
  return menu;
}

// Function to add the fixed gear icon
function addFixedGearIcon() {
  const gearIconId = 'erzyToolsGearIcon';
  if (document.getElementById(gearIconId)) {
    console.log('Gear icon already exists.');
    return;
  }

  if (!pageMenuElement) { 
    addPageMenu(); 
  }
  if (!geminiChatPanelElement) {
      addGeminiChatUI(); // This will now also initialize API key status display
  }

  const gearIcon = document.createElement('div');
  gearIcon.id = gearIconId;
  gearIcon.className = 'fixed bottom-5 right-5 bg-white p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer z-[99999] w-14 h-14 text-2xl hover:bg-gray-100 active:scale-90 transition-all duration-150';
  gearIcon.innerHTML = '<i class="fas fa-wrench text-gray-700"></i>';

  gearIcon.addEventListener('click', () => {
    if (pageMenuElement) {
      const isMenuHidden = pageMenuElement.classList.contains('translate-y-full');
      if (isMenuHidden) {
        pageMenuElement.classList.remove('translate-y-full');
        pageMenuElement.classList.add('translate-y-0');
      } else {
        pageMenuElement.classList.remove('translate-y-0');
        pageMenuElement.classList.add('translate-y-full');
      }
    }
  });

  let isDragging = false;
  let dragOffsetX, dragOffsetY;

  const savedPosition = localStorage.getItem('erzyToolsGearIconPosition');
  if (savedPosition) {
    try {
      const { x, y } = JSON.parse(savedPosition);
      if (typeof x === 'number' && typeof y === 'number') {
        gearIcon.style.right = 'auto';
        gearIcon.style.bottom = 'auto';
        gearIcon.style.left = `${x}px`;
        gearIcon.style.top = `${y}px`;
      } else {
        gearIcon.style.right = '20px'; 
        gearIcon.style.bottom = '20px';
      }
    } catch (e) {
      console.error("Error parsing gear icon position from localStorage:", e);
      gearIcon.style.right = '20px'; 
      gearIcon.style.bottom = '20px';
    }
  } else {
    gearIcon.style.right = '20px'; 
    gearIcon.style.bottom = '20px';
  }

  gearIcon.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragOffsetX = e.clientX - gearIcon.getBoundingClientRect().left;
    dragOffsetY = e.clientY - gearIcon.getBoundingClientRect().top;
    gearIcon.style.cursor = 'grabbing';
    e.preventDefault(); 
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const iconWidth = gearIcon.offsetWidth;
    const iconHeight = gearIcon.offsetHeight;

    newX = Math.max(0, Math.min(newX, viewportWidth - iconWidth));
    newY = Math.max(0, Math.min(newY, viewportHeight - iconHeight));
    
    gearIcon.style.right = 'auto'; 
    gearIcon.style.bottom = 'auto';
    gearIcon.style.left = `${newX}px`;
    gearIcon.style.top = `${y}px`;
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0 && isDragging) return;
    if (isDragging) {
      isDragging = false;
      gearIcon.style.cursor = 'pointer';
      localStorage.setItem('erzyToolsGearIconPosition', JSON.stringify({
        x: gearIcon.offsetLeft,
        y: gearIcon.offsetTop
      }));
    }
  });
  
  document.body.appendChild(gearIcon);
}

// Initial calls
addFontAwesomeLink();
addFixedGearIcon(); 

console.log('tool.js with Gemini API Key management initialized.');
