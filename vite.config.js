import {defineConfig} from 'vite';
import {createMarketService,marketMiddleware} from './server/market-service.js';
import {mortgageRateMiddleware} from './server/mortgage-rate.js';
import {livePreviewMiddleware} from './server/live-market-middleware.js';
const middleware=marketMiddleware(createMarketService());
export default defineConfig({plugins:[{name:'daily-fund-prices',configureServer(server){server.middlewares.use(livePreviewMiddleware);server.middlewares.use(mortgageRateMiddleware());server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(livePreviewMiddleware);server.middlewares.use(mortgageRateMiddleware());server.middlewares.use(middleware)}}]});
