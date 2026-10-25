// Three original instrumental soft-rock lounge tracks: gentle strummed guitar,
// electric piano, rounded bass and a quiet backbeat. No vocals or remote audio.
export const STORE_BPM=94,STORE_EIGHTH=60/STORE_BPM/2;
export const STORE_TRACKS=[
 {title:'Sunday Windows',strums:[0,3,4,7],chords:[[48,52,55,59],[43,47,50,55],[45,48,52,55],[41,45,48,52],[48,52,55,62],[43,47,50,57],[41,45,48,55],[43,47,50,55]],melody:[64,67,69,67,64,62,60,62]},
 {title:'Coastal Drive',strums:[0,2,5,7],chords:[[47,50,54,57],[43,47,50,54],[50,54,57,64],[45,49,52,57],[40,43,47,50],[43,47,50,57],[50,54,57,61],[45,49,52,59]],melody:[66,69,71,73,69,66,64,62]},
 {title:'After the Rain',strums:[0,3,5],chords:[[53,57,60,64],[45,48,52,55],[50,53,57,60],[46,50,53,57],[43,46,50,53],[48,52,55,62],[53,57,60,67],[48,53,55,60]],melody:[65,69,67,64,62,60,62,65]}
];
export const STORE_SCORE_STEPS=STORE_TRACKS.length*32*8;
export function storeScore(step){const position=((step%STORE_SCORE_STEPS)+STORE_SCORE_STEPS)%STORE_SCORE_STEPS,track=STORE_TRACKS[Math.floor(position/256)],bar=Math.floor(position/8)%32,s=position%8,chord=track.chords[bar%8],section=Math.floor(bar/8),notes=[];
 // Offbeat guitar strums leave space for the melody and the store's PA mix.
 if(track.strums.includes(s))for(let i=0;i<chord.length;i++)notes.push({midi:chord[i]+12,duration:s===7?.22:.65,type:'triangle',gain:.033,voice:'guitar',delay:i*.012});
 if(s===0||s===4||s===6)notes.push({midi:chord[0]-12+(s===6?7:0),duration:.42,type:'sine',gain:.12,voice:'bass'});
 if(s===0)for(const midi of chord)notes.push({midi:midi+12,duration:STORE_EIGHTH*7.2,type:'sine',gain:.027,voice:'keys'});
 if(section!==0&&[1,4,6].includes(s)){const midi=section===3?chord[(s+bar)%4]+12:track.melody[(bar*2+s)%8];notes.push({midi,duration:.5,type:'sine',gain:.095,voice:'keys'})}
 if(s===0||s===4)notes.push({midi:36,duration:.17,type:'sine',gain:.09,drum:'kick'});
 if(s===2||s===6)notes.push({midi:38,duration:.09,type:'sine',gain:.035,drum:'snare'});
 if(s%2===1)notes.push({midi:42,duration:.035,type:'sine',gain:.014,drum:'hat'});
 return notes;
}
export const midiFrequency=midi=>440*Math.pow(2,(midi-69)/12);
