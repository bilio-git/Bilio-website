const assert = require('node:assert/strict');
const physics = require('../wordmark-physics.js');
const surface = () => 279.57;
const origins = [{x:668.3,y:255.6}, {x:978.48,y:255.6}];
function opening(random) {
  const world=physics.createWorld(surface,{random});
  assert.deepEqual(world.balls.map(({x,y})=>({x,y})),origins,
    'Dots must start in their original positions on the wordmark');
  assert(world.balls.every(b=>b.vy<0),'Both dots must launch upward');
  const frames=[];
  for(let frame=0;frame<10;frame++) {
    for(let step=0;step<8;step++) world.step();
    frames.push(world.balls.map(({x,y})=>({x,y})));
  }
  const leading=frames[0].findIndex((dot,i)=>dot.y<origins[i].y);
  assert.notEqual(leading,-1,'One dot must leap on the first animation frame');
  for(const frame of frames) {
    assert(frame[leading].y<origins[leading].y,'The leading dot must rise');
    assert.deepEqual(frame[1-leading],origins[1-leading],
      'The follower must remain on its i until its own launch');
  }
  for(let step=0;step<240;step++) world.step();
  assert(world.balls.every(b=>b.wait===0),'Both dots must launch');
  return {leading,frames};
}
const low=opening(()=>0),high=opening(()=>.999999);
assert.equal(low.leading,0,'The left dot can lead');
assert.equal(high.leading,1,'The right dot can lead');
assert(low.frames[0][0].x<origins[0].x,'A dot can launch leftward');
assert(high.frames[0][1].x>origins[1].x,'A dot can launch rightward');
const runs=Array.from({length:32},()=>opening());
assert.equal(new Set(runs.map(run=>JSON.stringify(run.frames))).size,32,'Opening repeated');
console.log('PASS: 32 distinct upward leaps from the original dot positions; either dot can lead in either direction, then the follower launches.');
