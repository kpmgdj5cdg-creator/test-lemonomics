const NS='http://www.w3.org/2000/svg';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pointTime=date=>Date.parse(date.includes('T')?date:date+'T12:00:00Z');
const dateLabel=date=>new Date(pointTime(date)).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',...(date.includes('T')?{hour:'numeric',minute:'2-digit',timeZoneName:'short'}:{})});
export function drawChart(host,series,{portfolio=false,empty='Select a fund to compare its performance.',costBasis=null}={}){
  const all=series.flatMap(s=>s.points);host.innerHTML='';
  if(!all.length){host.innerHTML='<div class="invest-chart-empty">'+escape(empty)+'</div>';return}
  const width=Math.max(300,host.clientWidth||1000),height=width<600?250:300,pad={left:58,right:24,top:24,bottom:43};
  const minDate=Math.min(...all.map(p=>pointTime(p.date))),maxDate=Math.max(...all.map(p=>pointTime(p.date)));
  let lo=Math.min(0,...all.map(p=>p.value)),hi=Math.max(0,...all.map(p=>p.value));if(hi-lo<.001){lo-=portfolio?1:.5;hi+=portfolio?1:.5}
  const extra=(hi-lo)*.12;lo-=extra;hi+=extra;
  const x=date=>pad.left+(pointTime(date)-minDate)/(maxDate-minDate||1)*(width-pad.left-pad.right);
  const y=value=>pad.top+(hi-value)/(hi-lo)*(height-pad.top-pad.bottom);
  const valueLabel=value=>portfolio?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value):(value>0?'+':'')+value.toFixed(1)+'%';
  const dates=[...new Set(all.map(p=>p.date))].sort();
  let markup=`<title>${portfolio?'Portfolio net gain or loss in dollars':'Fund return comparison in percent'}</title><desc>${escape(series.map(s=>s.name).join(', '))}. ${dateLabel(dates[0])} through ${dateLabel(dates.at(-1))}.</desc>`;
  for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4;markup+=`<line x1="${pad.left}" x2="${width-pad.right}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e8dc"/><text x="${pad.left-9}" y="${y(v)+4}" text-anchor="end" class="chart-axis">${escape(valueLabel(v))}</text>`;}
  markup+=`<line x1="${pad.left}" x2="${width-pad.right}" y1="${y(0)}" y2="${y(0)}" stroke="#95a795" stroke-dasharray="4 4"/>`;
  const ticks=[...new Set(Array.from({length:Math.min(width<600?3:5,dates.length)},(_,i)=>dates[Math.round(i*(dates.length-1)/Math.max(1,Math.min(width<600?3:5,dates.length)-1))]))];
  ticks.forEach(date=>{markup+=`<text x="${x(date)}" y="${height-14}" text-anchor="${date===dates[0]?'start':date===dates.at(-1)?'end':'middle'}" class="chart-axis">${escape(new Date(pointTime(date)).toLocaleString('en-US',{timeZone:'America/New_York',...(maxDate-minDate<86400000?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',...(maxDate-minDate>200*86400000?{year:'2-digit'}:{})})}))}</text>`;});
  for(const s of series){
    if(s.points.length>1)markup+=`<path data-chart-series="${escape(s.name)}" d="${s.points.map((p,i)=>(i?'L':'M')+x(p.date).toFixed(2)+' '+y(p.value).toFixed(2)).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(s.points.length===1)markup+=`<circle data-chart-series="${escape(s.name)}" cx="${x(s.points[0].date)}" cy="${y(s.points[0].value)}" r="4" fill="${s.color}"/>`;
  }
  markup+=`<line class="chart-cursor" y1="24" y2="${height-pad.bottom}" stroke="#637b68" stroke-dasharray="3 3" visibility="hidden"/>`;
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',portfolio?'Portfolio net gain or loss history':'Selected fund return history');svg.setAttribute('tabindex','0');svg.innerHTML=markup;host.append(svg);
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;tooltip.setAttribute('aria-live','polite');host.append(tooltip);
  let index=dates.length-1;
  function show(i){index=Math.max(0,Math.min(dates.length-1,i));const date=dates[index],cursor=svg.querySelector('.chart-cursor');cursor.setAttribute('x1',x(date));cursor.setAttribute('x2',x(date));cursor.setAttribute('visibility','visible');
    tooltip.innerHTML='<strong>'+dateLabel(date)+'</strong>'+series.map(s=>{const p=s.points.find(p=>p.date===date);return p?'<span style="color:'+s.color+'">'+escape(s.name)+': '+escape(valueLabel(p.value))+(Number.isFinite(p.price)?' · $'+p.price.toFixed(2)+' / share':'')+'</span>':''}).join('')+(costBasis!==null?'<span>Your average purchase cost: $'+costBasis.toFixed(2)+' / share (includes fees)</span>':'');tooltip.hidden=false;
  }
  svg.addEventListener('pointermove',e=>{const point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse());const target=minDate+(local.x-pad.left)/(width-pad.left-pad.right)*(maxDate-minDate);let nearest=0;for(let i=1;i<dates.length;i++)if(Math.abs(pointTime(dates[i])-target)<Math.abs(pointTime(dates[nearest])-target))nearest=i;show(nearest);});
  svg.addEventListener('pointerleave',()=>{tooltip.hidden=true;svg.querySelector('.chart-cursor').setAttribute('visibility','hidden')});
  svg.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?dates.length-1:index+(e.key==='ArrowLeft'?-1:1));}});
}
