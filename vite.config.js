import {defineConfig} from 'vite';
import {createMarketService,marketMiddleware} from './server/market-service.js';
const middleware=marketMiddleware(createMarketService());
export default defineConfig({plugins:[{name:'daily-fund-prices',configureServer(server){server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(middleware)}}]});
