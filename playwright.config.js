import {defineConfig} from '@playwright/test';
export default defineConfig({
  // Software-rendered WebGL and multi-screen trading flows need a longer budget.
  testDir:'./tests',testMatch:'*.spec.js',testIgnore:'online.spec.js',workers:1,timeout:120000,expect:{timeout:15000},
  use:{baseURL:process.env.TEST_BASE_URL||'http://127.0.0.1:5173',viewport:{width:1440,height:1080},hasTouch:true,reducedMotion:'reduce',launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
