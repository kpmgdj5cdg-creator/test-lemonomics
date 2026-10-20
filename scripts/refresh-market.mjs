import {downloadMarket} from '../server/market-service.js';
import {writeFile,rename} from 'node:fs/promises';
try{
  const data=await downloadMarket();
  const path='src/data/market-snapshot.json';await writeFile(path+'.tmp',JSON.stringify(data));await rename(path+'.tmp',path);
  console.log('Saved '+data.asOf+' closing prices and five years of daily history for six funds. Run npm run build to update the standalone game.');
}catch(error){console.error('Could not download verified market prices:',error.message);process.exitCode=1}
