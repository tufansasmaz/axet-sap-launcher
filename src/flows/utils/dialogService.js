// Bazi Electron/Chromium yapilandirmalarinda window.prompt() DESTEKLENMEZ
// ("Uncaught Error: prompt() is not supported.") - window.confirm/alert
// genellikle calisir ama tutarlilik icin ikisini de aynen bu servisten
// gecirmek daha guvenli. Bu modul, React agaci disindaki (orn. FlowCanvas.jsx
// icindeki plain buildNodeContextMenuItems fonksiyonu gibi) kod parcalarinin
// da promise tabanli "async prompt/confirm" kullanabilmesi icin bilincli
// olarak React context YERINE basit bir modul-seviyesi singleton olarak
// tasarlandi (subscribe/notify) - DialogHost.jsx bunu dinleyip gercek modali
// gosterir, cagiran taraf sadece await eder.

let activeRequest = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(activeRequest));
}

export function subscribeDialog(fn) {
  listeners.add(fn);
  fn(activeRequest);
  return () => listeners.delete(fn);
}

export function requestPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    activeRequest = {
      type: 'prompt',
      message,
      defaultValue,
      resolve: (value) => {
        activeRequest = null;
        notify();
        resolve(value);
      }
    };
    notify();
  });
}

export function requestConfirm(message, tone = 'default') {
  return new Promise((resolve) => {
    activeRequest = {
      type: 'confirm',
      message,
      tone,
      resolve: (value) => {
        activeRequest = null;
        notify();
        resolve(value);
      }
    };
    notify();
  });
}

export function requestAlert(message) {
  return new Promise((resolve) => {
    activeRequest = {
      type: 'alert',
      message,
      resolve: () => {
        activeRequest = null;
        notify();
        resolve();
      }
    };
    notify();
  });
}
