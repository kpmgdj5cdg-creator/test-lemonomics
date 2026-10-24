// Original 32-bar elevator-synth arrangement. No recordings, vocals or remote assets.
export const STORE_BPM=86,STORE_EIGHTH=60/STORE_BPM/2,STORE_SCORE_STEPS=32*8;
const chords=[[53,57,60,64],[50,53,57,60],[46,50,53,57],[48,52,55,59],[45,48,52,55],[50,53,57,64],[43,46,50,57],[48,52,57,62]];
const phrases=[[1,4,6],[0,3,5,7],[2,5],[1,3,6]];
export function storeScore(step){const bar=Math.floor(step/8)%32,s=step%8,chord=chords[bar%8],section=Math.floor(bar/8),notes=[];
 if(s===0)for(const midi of chord)notes.push({midi:midi+12,duration:STORE_EIGHTH*7.8,type:'triangle',gain:.052});
 if(s===0||s===4)notes.push({midi:chord[0]-12,duration:STORE_EIGHTH*2.8,type:'sine',gain:.13});
 if(phrases[bar%4].includes(s)){const midi=chord[(s+section)%chord.length]+12+(section===2?12:0);notes.push({midi,duration:.48,type:'sine',gain:.13},{midi:midi+12,duration:.24,type:'triangle',gain:.018})}
 return notes;
}
export const midiFrequency=midi=>440*Math.pow(2,(midi-69)/12);
