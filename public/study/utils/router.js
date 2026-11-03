// Lightweight SPA router
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    window.addEventListener('hashchange', () => this._handleRoute());
  }
  register(path, handler) {
    this.routes[path] = handler;
    return this;
  }
  navigate(path) {
    window.location.hash = path;
  }
  start(defaultPath = '/') {
    if (!window.location.hash) {
      this.navigate(defaultPath);
    } else {
      this._handleRoute();
    }
  }
  _handleRoute() {
    let hash = window.location.hash.slice(1) || '/';
    if (!hash.startsWith('/')) hash = '/' + hash;
    
    // 1. Try exact match first
    let handler = this.routes[hash];
    
    // 2. Try wildcard match (e.g., /medical/:module)
    if (!handler) {
      for (const [route, h] of Object.entries(this.routes)) {
        if (route.includes(':')) {
          const routeParts = route.split('/').filter(Boolean);
          const hashParts = hash.split('/').filter(Boolean);
          if (routeParts.length === hashParts.length) {
            const match = routeParts.every((part, i) => part.startsWith(':') || part === hashParts[i]);
            if (match) {
              const paramObj = {};
              routeParts.forEach((part, i) => {
                if (part.startsWith(':')) paramObj[part.slice(1)] = hashParts[i];
              });
              handler = () => h(paramObj);
              break;
            }
          }
        }
      }
    }
    
    if (handler) {
      if (this.beforeEach) this.beforeEach(hash);
      this.currentRoute = hash;
      handler();
    } else {
      console.warn('Route not found:', hash);
    }
  }
}

export default new Router();
