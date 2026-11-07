// Run with @napi-rs/canvas available on NODE_PATH (no browser/server required).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas, Path2D} = require('@napi-rs/canvas');
const Physics = require(process.env.BILIO_PHYSICS_MODULE || '../wordmark-physics.js');
global.document = {createElementNS: () => createCanvas(1, 1)};
global.Path2D = Path2D;

// Exercise the production collision sampler with the real vector outlines.
const svg = fs.readFileSync(path.join(__dirname, '../assets/Bilio_Wordmark.animated.svg'), 'utf8');
const paths = [...svg.matchAll(/<g data-solid="true" data-letter="([^"]+)"><path\s([^>]+)/g)]
  .map(([,letter,attrs]) => ({
    parentElement: {getAttribute: () => letter},
    getAttribute: name => attrs.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1] ?? null
  }));
assert.equal(paths.length, 6);
const surface = Physics.surfaceFromSVG({querySelectorAll: () => paths});
const dt = Physics.STEP;
const seeded = seed => () => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
};

for (const compressed of [false, true]) {
  for (const [side,x,vx] of [['left',710,150], ['right',938,-150]]) {
    const softness = Physics.createSoftness(surface);
    if (compressed) {
      softness.hit({x:824.05, vx:0, vy:900});
      for (let i=0; i<40; i++) softness.step(dt);
    }
    const world = Physics.createWorld(surface, {
      random: seeded(7123), onLetterHit: softness.hit, onStep: softness.step
    });
    Object.assign(world.balls[0], {x, y:180, vx, vy:0, wait:0});
    Object.assign(world.balls[1], {x:1250, y:-300, vx:0, vy:0, wait:10});
    for (let i=0; i<96; i++) {
      world.step();
      const ball = world.balls[0], t=(i+1)*dt;
      // A vertical wall must not teleport the dot upward or restart its arc.
      assert(Math.abs(ball.y-(180+Physics.G*t*t/2))<1e-7,
        `${side} side changed the vertical arc at step ${i}`);
      assert(Math.abs(ball.vy-Physics.G*t)<1e-7, `${side} side added vertical impulse`);
    }
    assert(world.balls[0].vx*vx<0, `${side} side did not rebound outward`);
    assert.equal(world.balls[0].hits, 1, `${side} side repeatedly retriggered`);
  }
}
console.log('PASS: both L sides rebound once without vertical jumps, including during compression.');

// Smooth caps must not inherit the old raster staircase's abrupt normals.
for(const amount of [0,20]) {
  surface.setCompression([0,0,amount,0,0]);
  const sy=1-amount/780.12, cy=780.12+(54.58-780.12)*sy;
  const rx=55.91+54.58, ry=54.58+54.58*sy;
  for(let angle=.03;angle<Math.PI-.03;angle+=.017) {
    const hit=surface.collision(824.05+(rx-.005)*Math.cos(angle),cy-(ry-.005)*Math.sin(angle));
    assert(hit&&hit.letter===2,'Missed rounded L cap');
    let nx=Math.cos(angle)/rx,ny=-Math.sin(angle)/ry;
    const length=Math.hypot(nx,ny);nx/=length;ny/=length;
    assert(Math.hypot(nx-hit.nx,ny-hit.ny)<.00001,'Discontinuous cap normal');
    assert(hit.penetration<.01,'Cap correction jumps');
  }
}
surface.setCompression([0,0,0,0,0]);
console.log('PASS: smooth L shoulder normals, both rigid and compressed.');

let maxStepDistance=0, totalLetterHits=0, totalBallHits=0;
const cases = [1,17,7123,48391,99371,2147483647,3141592653,4294967295]
  .map(seed => [seed,seeded(seed)]).concat([['minimum',()=>0],['maximum',()=>.999999]]);
for (const [label,random] of cases) {
  const softness = Physics.createSoftness(surface);
  const world = Physics.createWorld(surface, {random,onLetterHit:softness.hit,onStep:softness.step});
  let peakCompression=0;
  for (let i=0; i<480*120; i++) {
    const before=world.balls.map(b=>({...b})), stats=world.stats;
    world.step();
    peakCompression=Math.max(peakCompression,...softness.displacement);
    for (const [j,ball] of world.balls.entries()) {
      assert(Number.isFinite(ball.x+ball.y+ball.vx+ball.vy), `Non-finite state: ${label}`);
      assert(ball.x>=-24&&ball.x<=1666&&ball.y>=-565&&ball.y<=805,
        `Out of bounds: ${label} ${JSON.stringify(ball)}`);
      assert((surface.collision(ball.x,ball.y)?.penetration ?? 0)<.02,
        `Letter penetration: ${label} at ${world.stats.time} ${JSON.stringify({before:before[j],ball,contact:surface.collision(ball.x,ball.y)})}`);
      const distance=Math.hypot(ball.x-before[j].x,ball.y-before[j].y);
      maxStepDistance=Math.max(maxStepDistance,distance);
      assert(distance<6, `Position jump: ${label}, ${distance} units in one step`);
      if(before[j].wait===0&&stats.letterHits===world.stats.letterHits&&stats.ballHits===world.stats.ballHits) {
        assert(Math.abs(ball.vy-before[j].vy-Physics.G*dt)<1e-7, 'Non-ballistic vertical flight');
        assert(Math.abs(ball.vx-before[j].vx)<1e-7, 'Unexpected midair lateral change');
      }
    }
  }
  assert(world.balls.every(ball=>ball.hits>20), `A dot stopped bouncing: ${label}`);
  assert(peakCompression>=5&&peakCompression<=28.001, 'Missing or excessive compression');
  totalLetterHits+=world.stats.letterHits; totalBallHits+=world.stats.ballHits;
  console.log(`PASS: ${label}, two simulated minutes, ${world.stats.letterHits} letter contacts, ${world.stats.ballHits} dot contacts.`);
}
assert(totalBallHits>0);
console.log('PASS: 20 simulated minutes; no jumps, outline penetration, stalled dots, or midair velocity changes.',
  {totalLetterHits,totalBallHits,maxStepDistance});

