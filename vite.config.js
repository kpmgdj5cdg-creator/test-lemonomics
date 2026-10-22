import {defineConfig} from 'vite';
import {createMarketService,marketMiddleware} from './server/market-service.js';
import {mortgageRateMiddleware} from './server/mortgage-rate.js';
const middleware=marketMiddleware(createMarketService());
export default defineConfig({plugins:[{name:'daily-fund-prices',configureServer(server){server.middlewares.use(mortgageRateMiddleware());server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(mortgageRateMiddleware());server.middlewares.use(middleware)}}]});
