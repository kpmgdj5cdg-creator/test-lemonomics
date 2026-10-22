// All price/quality/recognition tuning lives here. Factors are relative to $2,
// not customer counts. Traffic, permits and competition retain their own rules.
export const DEMAND_CONFIG={
 version:1,expectedPrice:2,baselineConversion:.60,
 quality:{better:.80,best:.95,intercept:.55,slope:.52},
 weather:{coldMax:40,hotMin:85},
 curves:{
  average:[[1,1.5],[1.25,1.4],[1.5,1.3],[1.75,1.15],[2,1],[2.25,.9],[2.5,.7],[2.75,.45],[3,.35],[3.25,.25],[3.5,.2],[3.75,.1],[4,0]],
  cold:[[1,1.45],[1.25,1.35],[1.5,1.25],[1.75,1.15],[2,1],[2.25,.8],[2.5,.55],[2.75,.3],[3,.15],[3.25,.05],[3.5,0]],
  hot:[[1,1.35],[1.25,1.25],[1.5,1.2],[1.75,1.1],[2,1],[2.25,.97],[2.5,.9],[2.75,.8],[3,.65],[3.25,.5],[3.5,.35],[3.75,.25],[4,.15],[4.25,.05],[4.5,0]],
 },
 locations:{neighborhood:1,park:.85,downtown:{good:1.2,better:1.1,best:.65},waterfront:.8},
 aliases:{square:'downtown',beach:'waterfront'},
 brand:{cap:.30,reductions:{classic:.05,shade:.02,music:.03,lemonstand:.08,lights:.04,castle:.12}},
};
