import { round, debt, inventoryValue } from './finance.js';
const sum=(rows,fn)=>round(rows.reduce((s,r)=>s+(fn(r)||0),0));
export function incomeForDay(state,day) {
 const rows=state.ledger.filter(r=>r.day===day),history=state.history.find(r=>r.day===day);
 const has=c=>rows.some(r=>r.category===c);
 const sales=sum(rows,r=>r.category==='sales'?r.cash:0)||(history?.revenue||0);
 const ingredients=sum(rows,r=>r.category==='cost'?r.expense:0)||(history?.cost||0);
 const permits=sum(rows,r=>r.category==='permit'?-r.cash:0)||(history?.permit||0);
 const spoilage=sum(rows,r=>r.category==='spoilage'?r.expense:0)||(history?.spoilCost||0);
 const interest=sum(rows,r=>r.category==='loan'?r.expense??Math.max(0,(r.loanChange||0)-(r.bankChange||0)):0);
 const investment=sum(rows,r=>r.category==='investment dividend'?r.bankChange:r.realizedGain||0)+sum((state.bank.portfolio?.trades||[]).filter(t=>t.gameDay===day&&!t.collateral),t=>t.realizedCents/100);
 const other=sum(rows,r=>!['cost','spoilage','loan'].includes(r.category)?r.expense:0);
 const resale=sum(rows,r=>['inventory sale','equipment sale'].includes(r.category)?r.gain:0);
 const income=round(sales+investment+resale),expenses=round(ingredients+permits+spoilage+interest+other);
 return {day,sales,investment,resale,ingredients,permits,spoilage,interest,other,income,expenses,profit:round(income-expenses)};
}
export function statements(state,supplies,equipment,value) {
 const days=[...new Set([...state.history.map(h=>h.day),...state.ledger.map(r=>r.day).filter(Number.isFinite)])].sort((a,b)=>a-b);
 if(!days.length)days.push(state.day);
 const reports=days.map(d=>incomeForDay(state,d));
 const labels={sales:'Lemonade sales',investment:'Investment income / (loss)',resale:'Resale gain / (loss)',income:'Total income',ingredients:'Ingredients and cups',permits:'Location permits',spoilage:'Inventory spoilage',interest:'Loan interest',other:'Other expenses / fees',expenses:'Total expenses',profit:'Net income / (loss)'};
 const income=[['Income Statement',...days.map(d=>`Day ${d}`),'Total'],...Object.entries(labels).map(([k,label])=>[label,...reports.map(r=>r[k]),sum(reports,r=>r[k])])];
 const inv=inventoryValue(state,supplies),equip=round(state.upgrades.reduce((s,id)=>s+(equipment.find(e=>e.id===id)?.price||0),0));
 const assets=round(state.cash+state.bank.checking+inv+equip+value),liabilities=debt(state),earnings=sum(reports,r=>r.profit);
 const balance=[['Balance Sheet',`Day ${state.day}`],['Cash at stand',state.cash],['Checking',state.bank.checking],['Inventory at cost',inv],['Equipment at cost',equip],['Investments at market value',value],['Total assets',assets],['Loan liabilities (including term interest)',liabilities],['Reported retained earnings',earnings],['Opening equity / unrealized investment adjustment',round(assets-liabilities-earnings)],['Total equity',round(assets-liabilities)],['Total liabilities and equity',assets]];
 const rows=state.ledger;
 const totalCash=round(state.cash+state.bank.checking),movement=sum(rows,r=>(r.cash||0)+(r.bankChange||0));
 const group=r=>['loan','loan payment'].includes(r.category)?'financing':['equipment','equipment sale','investment buy','investment sell','investment transfer'].includes(r.category)?'investing':'operating';
 const flow=[['Statement of Cash Flow','Amount'],['Opening cash and checking',round(totalCash-movement)],...['operating','investing','financing'].map(g=>[`Net cash from ${g}`,sum(rows.filter(r=>group(r)===g),r=>(r.cash||0)+(r.bankChange||0))]),['Net change in cash',movement],['Ending cash and checking',totalCash],['Noncash collateral debt payments',sum(rows,r=>r.category==='collateral liquidation'?-(r.loanChange||0):0)]];
 return [['Income Statement',income],['Balance Sheet',balance],['Statement of Cash Flow',flow]];
}
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const enc=new TextEncoder();
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
// Small ZIP/OOXML writer: genuine offline .xlsx with three sheets and numeric cells, no CDN or runtime dependency.
function zip(entries){const parts=[],central=[];let offset=0,centralSize=0;const u16=(v,o,n)=>v.setUint16(o,n,true),u32=(v,o,n)=>v.setUint32(o,n,true);
 for(const [name,text] of entries){const n=enc.encode(name),data=enc.encode(text),crc=crc32(data),h=new Uint8Array(30+n.length),v=new DataView(h.buffer);u32(v,0,0x04034b50);u16(v,4,20);u16(v,10,0);u16(v,12,33);u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,n.length);h.set(n,30);parts.push(h,data);
 const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);u32(w,0,0x02014b50);u16(w,4,20);u16(w,6,20);u16(w,14,33);u32(w,16,crc);u32(w,20,data.length);u32(w,24,data.length);u16(w,28,n.length);u32(w,42,offset);c.set(n,46);central.push(c);centralSize+=c.length;offset+=h.length+data.length;}
 const end=new Uint8Array(22),v=new DataView(end.buffer);u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);u32(v,12,centralSize);u32(v,16,offset);return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
export function workbook(sheets){const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const entries=[['[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],['_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name],i)=>`<sheet name="${xml(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],['xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`]];
 sheets.forEach(([,rows],i)=>entries.push([`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="${ns}"><sheetData>${rows.map((row,j)=>`<row r="${j+1}">${row.map(value=>typeof value==='number'&&Number.isFinite(value)?`<c><v>${value}</v></c>`:`<c t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`]));return zip(entries);
}
export function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export function csvReports(sheets){for(const [name,rows] of sheets)download(new Blob([rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv'}),name.toLowerCase().replaceAll(' ','-')+'.csv');}
