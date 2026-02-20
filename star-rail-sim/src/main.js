
import { createApp } from 'vue'

// Global window error handler (catches errors before Vue mounts)
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Window Error:', message, source, lineno, colno, error);
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.background = 'darkred';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '10000';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerText = `System Crash (Window): ${message}\n${source}:${lineno}:${colno}\n${error?.stack || ''}`;
  document.body.appendChild(errorDiv);
  return false;
};

// Global promise rejection handler
window.onunhandledrejection = function(event) {
  console.error('Unhandled Rejection:', event.reason);
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%'; // Offset to not overlap
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.background = 'darkorange';
  errorDiv.style.color = 'black';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '10000';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.innerText = `Unhandled Promise Rejection: ${event.reason}`;
  document.body.appendChild(errorDiv);
};

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)

app.config.errorHandler = (err, vm, info) => {
  console.error('Global Error Handler:', err, info);
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.background = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '10px';
  errorDiv.style.zIndex = '9999';
  errorDiv.innerText = `Global Error (Vue): ${err.message || err}\n${info}`;
  document.body.appendChild(errorDiv);
};

app.use(ElementPlus)
app.mount('#app')
