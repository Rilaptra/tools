const addFontAwesomeLink = () => {
  const linkElement = document.createElement('link');
  linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
  linkElement.rel = 'stylesheet';
  document.head.appendChild(linkElement);
};

function done() {
    // Membuat elemen div untuk pop-up
    const popup = document.createElement('div');
    // Menetapkan teks dan gaya untuk pop-up menggunakan cssText
    popup.textContent = 'Success!';
    popup.style.cssText = `
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #28a745; /* Hijau yang lebih cerah */
        color: white;
        font-weight: bold;
        font-family: Courier, monospace;
        padding: 10px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        text-align: center;
        z-index: 1000;
        animation: slideDown 0.5s ease-out;
    `;
    // Animasi slideDown
    const keyframes = `
        @keyframes slideDown {
            from { top: 12%; opacity: 0; }
            to { top: 15%; opacity: 1; }
        }
        @keyframes slideUp {
            from { top: 15%; opacity: 1; }
            to { top: 12%; opacity: 0; }
        }
    `;
    // Menambahkan keyframes ke style head jika belum ada
    if (!document.head.querySelector('#popup-animation')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'popup-animation';
        styleSheet.textContent = keyframes;
        document.head.appendChild(styleSheet);
    }
    // Menambahkan pop-up ke dalam body
    document.body.appendChild(popup);
    // Menghilangkan pop-up setelah beberapa detik
    setTimeout(() => {
    	popup.style.animation = "slideUp 0.5s ease-out"
    }, 2500);
    setTimeout(() => {
        document.body.removeChild(popup);
    }, 3000);
}

const newButton = (name, parent, func) => {
  const button = document.createElement('li');
  button.innerText = name; // Menggunakan parameter name
  button.style.cssText = `
    background-color: #f0f0f0;
    color: #333;
    padding: 8px 16px;
    border: solid 2px #333; 
    cursor: pointer;
    border-radius: 8px; 
    text-align: center;
    font-family: 'Courier New', Courier, monospace; 
    font-size: 16px;
    height: fit-content;
    box-shadow: 3px 3px 0px #888; 
    transition: background-color 0.1s, box-shadow 0.1s, transform 0.1s; 
  `;

  // Menambahkan efek hover
  button.onclick = () => {
    button.style.backgroundColor = '#e8e8e8'; // Mengubah warna saat hover
    button.style.boxShadow = '5px 5px 0px #666'; // Meningkatkan shadow saat hover
    button.style.transform = 'translate(-2px, -2px)'; // Membuat efek sedikit terangkat
    setTimeout( () => {
      button.style.backgroundColor = '#f0f0f0';
      button.style.boxShadow = '3px 3px 0px #888';
      button.style.transform = 'translate(0, 0)';
    }, 100)
    func()
  };

  parent.appendChild(button);
  return button;
};


// Fungsi untuk menambahkan page menu
const addPageMenu = () => {
  const pageMenu = document.createElement('div');
  pageMenu.style.cssText = `
    position: fixed;
    bottom: -50vh;
    left: 0;
    width: 100%;
    height: 50vh;
    background-color: #f8f8f8;
    border-top: 3px solid #ccc;
    border-radius: 50px;
    box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.2);
    transition: bottom 0.3s;
    z-index: 99998;
    display: flex;
    flex-direction: column; 
    padding: 10px;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
    font-size: 30px;
`;
  pageMenu.innerText = "TOOLS by Erzy.sh"


  // Membuat ul untuk menampung tombol-tombol
  const ul = document.createElement('ul');
  ul.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    list-style: none;
    padding: 0;
    margin: 5px;
    gap: 10px;
`;

  const b1 = newButton("Make All Blockable", ul, () => {
    document.querySelectorAll("*").forEach(elemen => elemen.style.userSelect = "auto");
    done();
  })
  const b2 = newButton("JS Executor", ul, () => {
  	const input = prompt("Javascript")
      try {
      	const result = eval(input);
          if (!result) {
          	done()
          } else {
          	alert(result)
              done()
          }
      } catch (e) {
      	alert(e)
      }
  })
  pageMenu.appendChild(ul);

  document.body.appendChild(pageMenu);
  return pageMenu;
};

// Gear Icon

const addFixedGearIcon = () => {
  const gearIconDiv = document.createElement('div');
  gearIconDiv.style.cssText = `
    --size: 3rem;
    position: fixed;
    bottom: 20px;
    right: 20px;
    font-size: calc(var(--size) * 2);
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 50%;
    width: var(--size);
    height: var(--size);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    opacity: 0.7;
    z-index: 99999;
    transition: transform 0.3s, background-color 0.3s; /* Penambahan efek transisi */
  `;

  gearIconDiv.innerHTML = `<i class="fa-solid fa-wrench" id="gearIcon"></i>`;
  const ic = gearIconDiv.querySelector("#gearIcon");
  ic.style.fontSize = "1.5rem";
  
  const moveElement = e => {
    e.preventDefault()
    const { pageX, pageY } = e.targetTouches[0];
    const offsetX = gearIconDiv.offsetWidth / 2;
    const offsetY = gearIconDiv.offsetHeight / 2;
    gearIconDiv.style.left = `${pageX - offsetX}px`;
    gearIconDiv.style.top = `${pageY - offsetY}px`;
    gearIconDiv.style.right = 'auto';
    gearIconDiv.style.bottom = 'auto';
  };

  const pageMenu = addPageMenu()
  let isClicked = false;
  
  // Event Listener untuk On Touch / Click
  const changeStyle = (transform, bgColor) => {
    gearIconDiv.style.transform = transform;
    gearIconDiv.style.backgroundColor = bgColor;
  };
  gearIconDiv.addEventListener('touchstart', () => changeStyle('', 'rgba(128, 128, 128, 0.5)'));
  gearIconDiv.addEventListener('touchend', () => changeStyle('', '#fff'));
  gearIconDiv.addEventListener('click', () => {
    isClicked = !isClicked;
    if (isClicked) {
      //Animation
      changeStyle(`scale(0.9) rotate(360deg)`, 'rgba(128, 128, 128, 0.5)');
    setTimeout(() => {
      changeStyle(`scale(1) rotate(360deg)`, '#fff');
    }, 300);
      //Utils
      pageMenu.style.bottom = "0vh";
    } else {
      //Animation
      changeStyle(`scale(0.9) rotate(0deg)`, 'rgba(128, 128, 128, 0.5)');
    setTimeout(() => {
      changeStyle(`scale(1) rotate(0deg)`, '#fff');
    }, 300);
      //Utils
      pageMenu.style.bottom = "-50vh";
    }
  });


  gearIconDiv.addEventListener('touchmove', moveElement);
  document.body.appendChild(gearIconDiv);
};

addFontAwesomeLink();
addFixedGearIcon();
