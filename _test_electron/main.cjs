const { app, BrowserWindow } = require('electron');
console.log('app type:', typeof app);
console.log('BrowserWindow type:', typeof BrowserWindow);

if (app && app.whenReady) {
  app.whenReady().then(() => {
    console.log('SUCCESS! Electron API works!');
    app.quit();
  });
} else {
  console.log('FAILED - app is not available');
  // Try to print what require('electron') actually returns
  const e = require('electron');
  console.log('electron module is:', typeof e, JSON.stringify(String(e).slice(0, 100)));
  process.exit(1);
}
