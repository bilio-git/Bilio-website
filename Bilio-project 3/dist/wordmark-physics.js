/* Fixed-step gravity, original-outline contacts, equal-mass dot collisions.
 * Letter contacts supply an upward impulse to sustain the animation.
 * All lengths are SVG units; time is seconds. No tweens in flight.
 */
const BilioPhysics = (() => {
  const G = 900, RX = 55.91, RY = 54.58, STEP = 1 / 480;
  const ORIGINS = [{ x: 668.3, y: 255.6 }, { x: 978.48, y: 255.6 }];
  const LETTERS = ['b', 'i-left', 'l', 'i-right', 'o'];
  const HEIGHTS = [780.12, 445.97, 780.12, 445.97, 567.12];
  // Refill entropy as the animation runs; there is no repeating seeded route.
  const entropy=new Uint32Array(128);
  let entropyIndex=entropy.length;
  function freshRandom() {
    if(!globalThis.crypto?.getRandomValues) return Math.random();
    if(entropyIndex===entropy.length) { crypto.getRandomValues(entropy); entropyIndex=0; }
    return entropy[entropyIndex++]/4294967296;
  }
  function surfaceFromSVG(svg) {
    const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
    canvas.width = 3286; canvas.height = 1562;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(2, 2);
    for (const path of svg.querySelectorAll('[data-solid] path')) {
      const id = LETTERS.indexOf(path.parentElement.getAttribute('data-letter')) + 1;
      ctx.fillStyle = `rgb(${id*40},0,0)`;
      ctx.fill(new Path2D(path.getAttribute('d')), path.getAttribute('fill-rule') || 'nonzero');
    }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const top = new Float64Array(3286).fill(Infinity);
    const owners = new Int8Array(3286).fill(-1);
    for (let x = 0; x < 3286; x++) {
      for (let y = 0; y < 1562; y++) {
        if (pixels[(y * 3286 + x) * 4 + 3] > 127) {
          top[x] = y / 2;
          owners[x] = Math.round(pixels[(y*3286+x)*4]/40)-1;
          break;
        }
      }
    }
    const offset = 56, surface = new Float64Array(1756).fill(Infinity);
    for (let i = 0; i < surface.length; i++) {
      const x = i - offset;
      for (let col = Math.max(0, Math.ceil((x-RX)*2)); col <= Math.min(3285, Math.floor((x+RX)*2)); col++) {
        const dx = (col/2-x)/RX;
        surface[i] = Math.min(surface[i], top[col] - RY*Math.sqrt(Math.max(0, 1-dx*dx)));
      }
    }
    let compression = LETTERS.map(() => 0);
    let localOffset=()=>0, localActive=()=>false;
    const result = x => {
      if (localActive() || compression.some(v => Math.abs(v) > .0001)) return contact(x).y;
      const i = Math.floor(x + offset), u = x + offset - i;
      if (i < 0 || i + 1 >= surface.length) return Infinity;
      return surface[i] * (1-u) + surface[i+1] * u;
    };
    function contact(x) {
      let y=Infinity, letter=-1, contactX=x, contactY=0;
      // Use the same compressed outline for rendering and physical contact.
      for (let col=Math.max(0,Math.ceil((x-RX)*2)); col<=Math.min(3285,Math.floor((x+RX)*2));col++) {
        const id=owners[col];
        if(id<0) continue;
        const sy=1-compression[id]/HEIGHTS[id];
        const edge=780.12+(top[col]-780.12)*sy+localOffset(id,col/2,top[col]);
        const dx=(col/2-x)/RX;
        const candidate=edge-RY*Math.sqrt(Math.max(0,1-dx*dx));
        if(candidate<y) { y=candidate; letter=id; contactX=col/2; contactY=top[col]; }
      }
      return { y, letter, contactX, contactY };
    }
    // The upper outline alone is a height field: at a tall letter's side its
    // height jumps abruptly. Include vertical edges and resolve the nearest
    // point in two dimensions so a side hit cannot lift a dot onto the top.
    const sides=[];
    for(let col=0;col<top.length;col++) {
      const id=owners[col];
      if(id<0) continue;
      if(col===0||owners[col-1]!==id) sides.push({col,id,left:true});
      if(col===top.length-1||owners[col+1]!==id) sides.push({col,id,left:false});
    }
    function collision(x,y) {
      // Smooth capsules replace the raster staircase on the three stems.
      // In the straight portion, the contact normal is exactly horizontal.
      let stemHit=null;
      for(const [id,cx,topY] of [[1,668.3,334.15],[2,824.05,0],[3,978.48,334.15]]) {
        const sy=1-compression[id]/HEIGHTS[id];
        const upper=780.12+(topY+54.58-780.12)*sy;
        const lower=780.12-54.58*sy;
        const cy=Math.max(upper,Math.min(lower,y));
        const rx=RX+54.58, ry=RY+54.58*sy;
        const ex=(x-cx)/rx, ey=(y-cy)/ry, distance=Math.hypot(ex,ey);
        if(distance>=1) continue;
        const direction=distance>1e-9?ex/distance:(x<cx?-1:1);
        const vertical=distance>1e-9?ey/distance:0;
        const correctedX=cx+rx*direction, correctedY=cy+ry*vertical;
        let nx=direction/rx, ny=vertical/ry;
        const length=Math.hypot(nx,ny); nx/=length; ny/=length;
        const hit={letter:id,nx,ny,x:correctedX,y:correctedY,
          contactX:cx+54.58*direction,
          contactY:780.12+(cy+54.58*sy*vertical-780.12)/sy,
          penetration:Math.hypot(correctedX-x,correctedY-y)};
        if(!stemHit||hit.penetration>stemHit.penetration) stemHit=hit;
      }
      if(y<result(x)-1) return stemHit;
      let closest=null, best=Infinity;
      const edge=(id,x,y)=>780.12+(y-780.12)*(1-compression[id]/HEIGHTS[id])+localOffset(id,x,y);
      function segment(x0,y0,x1,y1,id) {
        const ay=edge(id,x0,y0), by=edge(id,x1,y1);
        const dx=(x1-x0)/RX, dy=(by-ay)/RY;
        const px=(x-x0)/RX, py=(y-ay)/RY;
        const length=dx*dx+dy*dy;
        if(length===0) return;
        const t=Math.max(0,Math.min(1,(px*dx+py*dy)/length));
        const ex=px-t*dx, ey=py-t*dy, d2=ex*ex+ey*ey;
        if(d2<best) {
          best=d2;
          closest={letter:id,contactX:x0+t*(x1-x0),contactY:y0+t*(y1-y0),
            qy:ay+t*(by-ay),ex,ey,edgeNX:by-ay,edgeNY:x0-x1};
        }
      }
      const first=Math.max(0,Math.floor((x-RX)*2)-1);
      const last=Math.min(top.length-2,Math.ceil((x+RX)*2));
      for(let col=first;col<=last;col++) {
        const id=owners[col];
        if((id===0||id===4)&&owners[col+1]===id) segment(col/2,top[col],(col+1)/2,top[col+1],id);
      }
      for(const {col,id,left} of sides) {
        if(id!==0&&id!==4) continue;
        if(Math.abs(col/2-x)>RX) continue;
        if(left) segment(col/2,780.12,col/2,top[col],id);
        else segment(col/2,top[col],col/2,780.12,id);
      }
      const col=Math.round(x*2), id=owners[col];
      const inside=(id===0||id===4)&&y>=edge(id,col/2,top[col])&&y<=780.12;
      if(!closest||(!inside&&best>=1)) return stemHit;
      const distance=Math.sqrt(best), sign=inside?-1:1;
      let nx,ny,correctedX,correctedY;
      if(distance>1e-9) {
        nx=sign*closest.ex/RX; ny=sign*closest.ey/RY;
        correctedX=closest.contactX+sign*RX*closest.ex/distance;
        correctedY=closest.qy+sign*RY*closest.ey/distance;
      } else {
        nx=closest.edgeNX; ny=closest.edgeNY;
        const radius=Math.hypot(RX*nx,RY*ny);
        correctedX=x+RX*RX*nx/radius;
        correctedY=y+RY*RY*ny/radius;
      }
      const length=Math.hypot(nx,ny); nx/=length; ny/=length;
      const hit={...closest,nx,ny,x:correctedX,y:correctedY,
        penetration:Math.hypot(correctedX-x,correctedY-y)};
      return stemHit&&stemHit.penetration>hit.penetration?stemHit:hit;
    }
    result.contact=contact;
    result.collision=collision;
    result.setCompression=values=> { compression=values; };
    result.setLocalDeformation=(offset,active)=> { localOffset=offset; localActive=active; };
    return result;
  }
  function createSoftness(surface) {
    const displacement=LETTERS.map(()=>0), velocity=LETTERS.map(()=>0);
    const waves=[], geometry=new WeakMap();
    let enabled=true;
    surface.setCompression(displacement);
    function localOffset(id,x,y) {
      if(id!==0&&id!==4) return 0;
      let offset=0;
      for(const wave of waves) {
        if(wave.letter!==id) continue;
        // Compact support: a soft dent spreads a little, then stops completely.
        const radius=110+45*(1-Math.exp(-wave.age*7));
        const r2=((x-wave.x)/radius)**2+((y-wave.y)/(radius*1.2))**2;
        if(r2<1) offset+=wave.d*(1-r2)**3;
      }
      return Math.max(-8,Math.min(28,offset));
    }
    surface.setLocalDeformation(localOffset,()=>waves.length>0);
    return {
      displacement, localOffset,
      setEnabled(value) { enabled=value; displacement.fill(0); velocity.fill(0); waves.length=0; },
      hit(ball, contact=surface.contact(ball.x)) {
        if(!enabled) return;
        // Side impacts do not squash a vertical stem along its whole height.
        if(contact.ny>-.5) return;
        const id=contact.letter;
        if(id<0) return;
        const speed=Math.hypot(ball.vx,ball.vy);
        if(id===0||id===4) {
          const existing=waves.find(w=>w.letter===id&&w.age<.08&&Math.hypot(w.x-contact.contactX,w.y-contact.contactY)<45);
          if(existing) existing.v=Math.min(950,existing.v+Math.min(850,speed*.9));
          else waves.push({letter:id,x:contact.contactX,y:contact.contactY,d:0,v:Math.min(850,speed*.9),age:0});
          return;
        }
        velocity[id]=Math.min(950,velocity[id]+Math.min(850,speed*.9));
      },
      step(dt) {
        if(!enabled) return;
        for(let i=waves.length-1;i>=0;i--) {
          const w=waves[i];
          w.age+=dt; w.v+=(-484*w.d-29*w.v)*dt; w.d+=w.v*dt;
          if(w.d>28) { w.d=28; w.v=Math.min(0,w.v); }
          if(w.age>2||(Math.abs(w.d)<.005&&Math.abs(w.v)<.02)) waves.splice(i,1);
        }
        for(let i=0;i<5;i++) {
          // Damped material spring: quick compression, gentle recovery.
          velocity[i]+=(-484*displacement[i]-29*velocity[i])*dt;
          displacement[i]+=velocity[i]*dt;
          if(displacement[i]>28) { displacement[i]=28; velocity[i]=Math.min(0,velocity[i]); }
          if(Math.abs(displacement[i])<.005&&Math.abs(velocity[i])<.02) {
            displacement[i]=0; velocity[i]=0;
          }
        }
      },
      render(svg, reduced) {
        for(const node of svg.querySelectorAll('[data-letter]')) {
          const id=LETTERS.indexOf(node.getAttribute('data-letter'));
          if(id===0||id===4) {
            node.removeAttribute('transform');
            for(const path of node.querySelectorAll('path')) {
              if(!geometry.has(path)) geometry.set(path,{original:path.getAttribute('d'),contours:JSON.parse(path.getAttribute('data-contours'))});
              const shape=geometry.get(path);
              if(reduced||!waves.some(w=>w.letter===id)) {
                if(path.getAttribute('d')!==shape.original) path.setAttribute('d',shape.original);
              } else {
                path.setAttribute('d',shape.contours.map(points=>points.map(([x,y],i)=>`${i?'L':'M'}${x} ${(y+localOffset(id,x,y)).toFixed(3)}`).join(' ')+'Z').join(' '));
              }
            }
            continue;
          }
          const sy=reduced?1:1-displacement[id]/HEIGHTS[id];
          node.setAttribute('transform',`matrix(1 0 0 ${sy} 0 ${780.12*(1-sy)})`);
        }
      }
    };
  }
  function createWorld(surface, options={}) {
    // Fresh samples in production; a seeded sampler can be injected for checks.
    const random = options.random ?? freshRandom;
    const leader=random()<.5 ? 0 : 1;
    const followDelay=.18+random()*.24;
    const balls = ORIGINS.map((p, i) => {
      const rise=90+random()*270;
      // Begin on the original i-dots, then leap upward after the page's pause.
      return { x:p.x, y:p.y, vx:(random()<.5 ? -1 : 1)*(90+random()*120),
        vy:-Math.sqrt(2*G*(p.y+rise)), wait:i===leader ? 0 : followDelay, hits:0 };
    });
    let time = 0, letterHits = 0, ballHits = 0;
    function launch(ball, contact) {
      options.onLetterHit?.(ball,contact);
      ball.hits++; letterHits++;
      if(contact&&contact.ny>-.5) {
        const approach=ball.vx*contact.nx+ball.vy*contact.ny;
        if(approach<0) {
          ball.vx-=1.75*approach*contact.nx;
          ball.vy-=1.75*approach*contact.ny;
        }
        return;
      }
      // Vary the impulse only at contact. Flight remains a smooth gravity arc.
      // Occasional lower hops interrupt the rhythm without stopping the motion.
      const target = 460 + random()*720;
      const rise = random()<.22 ? 80+random()*100 : 190+random()*170;
      ball.vy = -Math.sqrt(2*G*Math.max(120, ball.y + rise));
      const airTime = 2 * -ball.vy / G;
      ball.vx = Math.max(-190, Math.min(190, (target-ball.x)/airTime));
    }
    function resolveContact(ball,contact) {
      ball.x=contact.x+contact.nx*.002;
      ball.y=contact.y+contact.ny*.002;
      // A recovering letter or another dot may cause a tiny overlap while
      // this dot is already leaving. Separate it without another impulse.
      if(ball.vx*contact.nx+ball.vy*contact.ny<0) launch(ball,contact);
    }
    function advance(ball, dt) {
      const x0=ball.x, y0=ball.y, vy0=ball.vy;
      const x1=x0+ball.vx*dt, y1=y0+vy0*dt+G*dt*dt/2;
      if(surface.collision) {
        const hit=surface.collision(x1,y1);
        if(hit) {
          let lo=0,hi=dt;
          if(surface.collision(x0,y0)) hi=0;
          else for(let i=0;i<18;i++) {
            const t=(lo+hi)/2;
            if(surface.collision(x0+ball.vx*t,y0+vy0*t+G*t*t/2)) hi=t; else lo=t;
          }
          ball.x=x0+ball.vx*hi; ball.y=y0+vy0*hi+G*hi*hi/2; ball.vy=vy0+G*hi;
          resolveContact(ball,surface.collision(ball.x,ball.y)||hit);
          const remain=dt-hi;
          ball.x+=ball.vx*remain; ball.y+=ball.vy*remain+G*remain*remain/2; ball.vy+=G*remain;
        } else { ball.x=x1; ball.y=y1; ball.vy+=G*dt; }
        return;
      }
      if (y1 >= surface(x1) && y0 < surface(x0)+.001) {
        let lo=0, hi=dt;
        for (let i=0;i<18;i++) {
          const t=(lo+hi)/2;
          if (y0+vy0*t+G*t*t/2 >= surface(x0+ball.vx*t)) hi=t; else lo=t;
        }
        ball.x=x0+ball.vx*hi; ball.y=surface(ball.x); ball.vy=vy0+G*hi;
        launch(ball);
        const remain=dt-hi;
        ball.x+=ball.vx*remain; ball.y+=ball.vy*remain+G*remain*remain/2; ball.vy+=G*remain;
      } else { ball.x=x1; ball.y=y1; ball.vy+=G*dt; }
    }
    function step(dt=STEP) {
      options.onStep?.(dt);
      balls.forEach(ball=> {
        const waiting=Math.min(ball.wait,dt);
        ball.wait=Math.max(0,ball.wait-dt);
        if(waiting<dt) advance(ball,dt-waiting);
      });
      const [a,b]=balls, dx=b.x-a.x, dy=b.y-a.y;
      const distance=Math.hypot(dx/(2*RX),dy/(2*RY));
      if (a.wait===0 && b.wait===0 && distance < 1 && distance > 0) {
        const nx0=dx/(RX*RX), ny0=dy/(RY*RY), length=Math.hypot(nx0,ny0);
        const nx=nx0/length, ny=ny0/length;
        const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        const impulse = approach * 0.65; // Restitution 0.3: soft, dissipative dots.
        const correction=(1/distance-1)/2;
        a.x-=dx*correction; a.y-=dy*correction;
        b.x+=dx*correction; b.y+=dy*correction;
        if (approach > 0) {
          a.vx-=impulse*nx; a.vy-=impulse*ny;
          b.vx+=impulse*nx; b.vy+=impulse*ny;
          // Surface friction exchanges tangential momentum at contact.
          const tangent = (a.vx-b.vx)*-ny + (a.vy-b.vy)*nx;
          const friction = Math.max(-impulse*.45, Math.min(impulse*.45, tangent*.35));
          a.vx += friction*ny; a.vy -= friction*nx;
          b.vx -= friction*ny; b.vy += friction*nx;
          ballHits++;
        }
      }
      // A ball-ball correction can press a dot into a letter. Resolve that
      // real contact too, so it cannot fall through the outline next frame.
      for (const ball of balls) {
        if(ball.wait>0) continue;
        if(surface.collision) {
          // A dot can touch an i's rounded top and the L's side together.
          // Resolve both boundaries without forcing it above either letter.
          for(let i=0;i<8;i++) {
            const contact=surface.collision(ball.x,ball.y);
            if(!contact) break;
            resolveContact(ball,contact);
          }
          continue;
        }
        const floor=surface(ball.x);
        if (ball.y > floor) { ball.y=floor; launch(ball); }
      }
      time+=dt;
    }
    return { balls, step, get stats() { return { time, letterHits, ballHits }; } };
  }
  function mount(svg) {
    const surface=surfaceFromSVG(svg), softness=createSoftness(surface);
    const world=createWorld(surface,{onLetterHit:softness.hit,onStep:softness.step});
    const nodes=[...svg.querySelectorAll('[data-dot]')];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let paused=false, speed=1, last=null, accumulator=0, raf;
    function frame(now) {
      if (last !== null && !paused && !document.hidden && !reduced.matches) {
        accumulator+=Math.min((now-last)/1000,.05)*speed;
        while (accumulator>=STEP) { world.step(); accumulator-=STEP; }
      }
      last=now;
      softness.render(svg,reduced.matches);
      nodes.forEach((node,i)=> {
        const b=world.balls[i], origin=ORIGINS[i];
        node.setAttribute('transform', reduced.matches ? 'translate(0 0)' : `translate(${b.x-origin.x} ${b.y-origin.y})`);
      });
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
    return { world, setSoft(value) { softness.setEnabled(value); }, setPaused(value) { paused=value; }, setSpeed(value) { speed=value; }, destroy() { cancelAnimationFrame(raf); } };
  }
  return { mount, createWorld, createSoftness, surfaceFromSVG, G, STEP };
})();
if (typeof module !== 'undefined') module.exports = BilioPhysics;
