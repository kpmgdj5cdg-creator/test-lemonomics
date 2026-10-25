// Appearance is versioned, deterministic and independent of simulation RNG/emotion.
export const HAIRSTYLES=['short','medium','long','curly','wavy','spiky','buzz','balding','ponytail','bun','side-part','bald'];
export const CLOTHING=['tee','polo','hoodie','jacket','button-down','dress','skirt','jeans','shorts','uniform','athletic','jacket'];
export const EXPRESSIONS=['neutral','happy','sad','angry','surprised','concerned','talking'];
export function characterSeed(id){let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const pick=(values,n)=>values[n%values.length];
const bounded=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const color=(v,fallback)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:fallback;
export function characterAppearance(id=0,overrides={}){
 const seed=characterSeed(id);let n=seed;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n};
 const skin=pick(['#eac39c','#c99068','#a96e4e','#754a37','#edb68b','#53382f'],rand());
 const hair=pick(['#302825','#684431','#aa7141','#dbb467','#a4a1a0','#783c32'],rand());
 const shirt=pick(['#cd514c','#458d94','#dfa83e','#7f639e','#547c58','#e4d7b7','#355c8e','#c27692'],rand());
 const variant=rand(),b=overrides.body||{},f=overrides.face||{},h=overrides.hairStyle||HAIRSTYLES[variant%12],clothing=overrides.clothing||CLOTHING[(variant>>>8)%12];
 return {version:2,id:String(id),seed,type:overrides.type||'male',skin:color(overrides.skin,skin),hair:color(overrides.hair,hair),shirt:color(overrides.shirt,shirt),pants:color(overrides.pants,pick(['#354657','#6d624f','#42656a','#564759'],rand())),shoes:color(overrides.shoes,'#353a40'),hairStyle:HAIRSTYLES.includes(h)?h:'short',clothing:CLOTHING.includes(clothing)?clothing:'tee',body:{width:bounded(b.width,.9,1.12,[.94,1,1.08][rand()%3]),shoulders:bounded(b.shoulders,.94,1.08,[.96,1,1.06][rand()%3])},face:{width:bounded(f.width,.94,1.06,[.96,1,1.04][rand()%3]),jaw:f.jaw||pick(['square','tapered','round'],rand()),eyeSpacing:bounded(f.eyeSpacing,.075,.105,[.082,.094,.1][rand()%3]),eyeSize:bounded(f.eyeSize,.027,.04,[.03,.035,.039][rand()%3]),browThickness:bounded(f.browThickness,.012,.025,[.014,.019,.023][rand()%3]),nose:f.nose||pick(['small','wide','long'],rand()),browColor:color(f.browColor,hair)},accessories:{glasses:overrides.accessories?.glasses??(variant%5===0),hat:overrides.accessories?.hat??(variant%13===0),facialHair:overrides.accessories?.facialHair??(variant%7===0)},defaultExpression:EXPRESSIONS.includes(overrides.defaultExpression)?overrides.defaultExpression:'neutral'};
}
