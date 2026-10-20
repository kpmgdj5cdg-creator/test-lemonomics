import {zipSync,strToU8} from 'fflate';
import {portfolioTotals} from './investments.js';
import {round} from './business.js';
const rates={lemons:.5,sugar:.2,ice:.1,cups:.16};
export function statements(state,equipment=[],market=null){
 const days=Array.from({length:Math.max(1,state.day)},(_,i)=>i+1);
 const profits=Object.fromEntries(days.map(d=>[d,{sales:0,investment:0,cost:0,permit:0,interest:0,recipes:0,loss:0}]));
 for(const l of state.ledger){const d=profits[l.day];if(!d)continue;const c=l.category;
 if(c==='sales')d.sales+=l.cash||0;
 if(c==='cost'||c==='spoilage')d.cost+=l.expense||0;
 if(c==='permit')d.permit-=l.cash||0;
 if(c==='loan')d.interest+=l.expense??Math.max(0,(l.loanChange||0)-(l.bankChange||0));
 if(c==='recipes')d.recipes-=l.cash||0;
 if(c==='resale')d.loss+=l.loss||0;
 if(c==='collateral fee')d.interest+=l.expense||0;
 if(c==='investment dividend')d.investment+=l.bankChange||0;
 }
 const portfolio=state.bank.portfolio;
 for(const t of portfolio?.trades||[]){if(t.side==='sell'&&profits[t.gameDay])profits[t.gameDay].investment+=(t.realizedCents||0)/100;}
 const unrealized=portfolioTotals(state.bank,market).unrealizedCents/100;let previousMark=0;for(const day of days){const mark=day===state.day?unrealized:(state.financialMarks?.[day]??previousMark);profits[day].investment+=round(mark-previousMark);previousMark=mark;}
 const income=[['Income Statement',...days.map(d=>'Day '+d),'Totals']];
 const rows=[['Lemonade sales','sales',1],['Investment income / (loss), including unrealized','investment',1],['Ingredients, cups and spoilage','cost',-1],['Permits','permit',-1],['Loan interest and collateral fees','interest',-1],['Recipe books','recipes',-1],['Loss on resale','loss',-1]];
 const totals=days.map(()=>0);for(const [label,key,sign] of rows){const values=days.map((d,i)=>{const v=round(profits[d][key]*sign);totals[i]=round(totals[i]+v);return v});income.push([label,...values,round(values.reduce((a,b)=>a+b,0))]);}income.push(['Net income / (loss)',...totals,round(totals.reduce((a,b)=>a+b,0))]);
 const inventory=round(Object.entries(state.inventory).reduce((sum,[k,v])=>sum+v*rates[k],0)),equip=round(state.upgrades.reduce((sum,id)=>sum+(state.equipmentCosts?.[id]??equipment.find(u=>u.id===id)?.price??0),0));
 const investments=portfolioTotals(state.bank,market).valueCents/100,debt=round(state.bank.loans.reduce((s,l)=>s+l.balance,0)),assets=round(state.cash+state.bank.checking+inventory+equip+investments),net=income.at(-1).at(-1),opening=round(assets-debt-net);
 const balance=[['Balance Sheet','Aggregate'],['Stand cash',state.cash],['Checking',state.bank.checking],['Inventory at cost',inventory],['Equipment at cost',equip],['Investments at latest available close',investments],['Total assets',assets],['Loans payable',debt],['Opening / imported equity',opening],['Retained earnings',net],['Total liabilities and equity',round(debt+opening+net)]];
 const flow=[['Cash Flow',...days.map(d=>'Day '+d),'Totals']];const buckets={Operating:days.map(()=>0),Investing:days.map(()=>0),Financing:days.map(()=>0)};
 for(const l of state.ledger){const i=days.indexOf(l.day);if(i<0)continue;const amount=(l.cash||0)+(l.bankChange||0);const bucket=['loan','loan payment'].includes(l.category)?'Financing':['equipment','investment buy','investment sell','investment transfer'].includes(l.category)||(l.category==='resale'&&l.asset==='equipment')?'Investing':'Operating';buckets[bucket][i]=round(buckets[bucket][i]+amount)}
 for(const [key,values]of Object.entries(buckets))flow.push([key+' cash flow',...values,round(values.reduce((a,b)=>a+b,0))]);const movement=days.map((_,i)=>round(Object.values(buckets).reduce((s,v)=>s+v[i],0)));flow.push(['Net change in cash + checking',...movement,round(movement.reduce((a,b)=>a+b,0))]);flow.push(['Opening / imported cash + checking',round(state.cash+state.bank.checking-flow.at(-1).at(-1))]);flow.push(['Ending cash + checking',round(state.cash+state.bank.checking)]);
 return {income,balance,flow,days,profits};
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function workbook(sheets){const files={};const xml=s=>strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s);const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 files['[Content_Types].xml']=xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>');
 files['_rels/.rels']=xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 files['xl/workbook.xml']=xml(`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+sheets.map((s,i)=>`<sheet name="${escape(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>');
 files['xl/_rels/workbook.xml.rels']=xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+'</Relationships>');
 sheets.forEach((s,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=xml(`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="49" customWidth="1"/><col min="2" max="16384" width="17" customWidth="1"/></cols><sheetData>`+s.rows.map((r,j)=>`<row r="${j+1}">`+r.map(v=>typeof v==='number'?`<c><v>${round(v)}</v></c>`:`<c t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>')});return zipSync(files,{level:6})}
export function downloadStatements(state,equipment,market){const s=statements(state,equipment,market),data=workbook([{name:'Income Statement',rows:s.income},{name:'Balance Sheet',rows:s.balance},{name:'Cash Flow',rows:s.flow}]);const url=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download='Lemonade-Lane-Day-'+state.day+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
