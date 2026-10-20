(()=>{
  const scripts = document.querySelectorAll('script');
  let scriptSrc = '';
  scripts.forEach(s => {
    if (s.src && s.src.includes('intro.js')) scriptSrc = s.src;
  });

  const rootPath = scriptSrc.substring(0, scriptSrc.lastIndexOf('js/'));
  
  const d = document.createElement('div'), i = new Image();
  i.src = rootPath + 'images/logo.png'; 

  d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b1a12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;transition:opacity 1s;font:16px "Press Start 2P",monospace;color:#8fd9a8;text-shadow:3px 3px #1d4a30';
  d.innerHTML = '<canvas width=48 height=48 style="width:192px;height:192px;image-rendering:pixelated"></canvas><b></b>';
  document.body.append(d);
  
  const c = d.firstChild.getContext('2d'), t = d.lastChild;
  c.imageSmoothingEnabled = false;
  
  [...'Projet ToncPlay'].forEach((l,k) => setTimeout(() => t.textContent += l, 1400 + k * 50));
  i.onload = () => [4,8,16,32,48].forEach((n,k) => setTimeout(() => {
    const s = document.createElement('canvas');
    s.width = s.height = n;
    s.getContext('2d').drawImage(i, 0, 0, n, n);
    c.clearRect(0, 0, 48, 48);
    c.drawImage(s, 0, 0, 48, 48);
  }, k * 250));
  
  setTimeout(() => d.style.opacity = 0, 3500);
  setTimeout(() => d.remove(), 4500);
})();