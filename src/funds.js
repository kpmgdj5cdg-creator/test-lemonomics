export const FUNDS=Object.freeze([
  {symbol:'DIA',name:'Dow Jones',description:'30 large U.S. companies',fund:'SPDR Dow Jones Industrial Average ETF',risk:'Stock market risk',color:'#3267a8'},
  {symbol:'SPY',name:'S&P 500',description:'About 500 large U.S. companies',fund:'SPDR S&P 500 ETF Trust',risk:'Stock market risk',color:'#329260'},
  {symbol:'ARKK',name:'High Risk Fund',description:'Companies focused on innovation',fund:'ARK Innovation ETF',risk:'High risk · large price swings',color:'#b75b9a'},
  {symbol:'SGOV',name:'Low Risk Fund',description:'Short-term U.S. Treasury bills',fund:'iShares 0–3 Month Treasury Bond ETF',risk:'Lower risk · value can still fall',color:'#637992'},
  {symbol:'GLD',name:'Gold',description:'A fund backed by gold',fund:'SPDR Gold Shares',risk:'Metal prices can rise or fall',color:'#b88716'},
  {symbol:'SLV',name:'Silver',description:'A fund backed by silver',fund:'iShares Silver Trust',risk:'Metal prices can swing sharply',color:'#e07844'},
]);
export const SYMBOLS=FUNDS.map(f=>f.symbol);

export const BITCOIN={symbol:'BTC/USD',name:'Bitcoin',description:'Digital currency · trades 24 hours a day',fund:'Bitcoin / US Dollar',risk:'Very high risk · large price swings',color:'#dc8617',assetClass:'crypto'};
export const INVESTMENTS=Object.freeze([...FUNDS,BITCOIN]);
export const INVESTMENT_SYMBOLS=INVESTMENTS.map(f=>f.symbol);
export const isCrypto=symbol=>symbol===BITCOIN.symbol;
