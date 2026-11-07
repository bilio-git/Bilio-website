from pathlib import Path
import xml.etree.ElementTree as ET
import re
import math
import json
import hashlib

def contours(d):
    """Flatten the supplied M/C/S/H/V/L/Z paths without joining their holes."""
    tokens=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',d)
    result=[]; line=[]; point=(0,0); start=point; control=None; previous=''; i=0; command=''
    while i<len(tokens):
        if tokens[i].isalpha(): command=tokens[i]; i+=1
        kind=command.upper(); relative=command.islower()
        if kind=='Z':
            if len(line)>1: result.append(line)
            line=[]; point=start; control=None; previous='Z'; command=''; continue
        count={'M':2,'L':2,'H':1,'V':1,'C':6,'S':4}[kind]
        nums=list(map(float,tokens[i:i+count])); i+=count
        def xy(a,b): return (a+point[0],b+point[1]) if relative else (a,b)
        if kind=='M':
            if len(line)>1: result.append(line)
            point=xy(*nums); start=point; line=[point]; command='l' if relative else 'L'
        elif kind in ('C','S'):
            if kind=='C': c1=xy(*nums[:2]); c2=xy(*nums[2:4]); end=xy(*nums[4:])
            else:
                c1=(2*point[0]-control[0],2*point[1]-control[1]) if previous in ('C','S') else point
                c2=xy(*nums[:2]); end=xy(*nums[2:])
            count=max(2,math.ceil((math.dist(point,c1)+math.dist(c1,c2)+math.dist(c2,end))/4))
            for n in range(1,count+1):
                t=n/count; u=1-t
                line.append(tuple(u**3*point[k]+3*u*u*t*c1[k]+3*u*t*t*c2[k]+t**3*end[k] for k in (0,1)))
            point=end; control=c2
        else:
            end=xy(*nums) if kind=='L' else ((nums[0]+point[0] if relative else nums[0],point[1]) if kind=='H' else (point[0],nums[0]+point[1] if relative else nums[0]))
            count=max(1,math.ceil(math.dist(point,end)/4))
            line.extend(tuple(point[k]+(end[k]-point[k])*n/count for k in (0,1)) for n in range(1,count+1))
            point=end
        previous=kind
        if kind not in ('C','S'): control=None
    if len(line)>1: result.append(line)
    return [[[round(x,3),round(y,3)] for x,y in points] for points in result]
root = Path(__file__).parent
source = ET.parse(root / 'assets/Bilio_Wordmark.original.svg').getroot()
for i,p in enumerate(source):
    if i in (0,1,7): p.set('data-contours',json.dumps(contours(p.get('d')),separators=(',',':')))
paths = [ET.tostring(p, encoding='unicode').replace('ns0:', '').replace(':ns0', '') for p in source]
parts = []
for i, path in enumerate(paths):
    if i in (3, 6):
        side = 'left' if i == 3 else 'right'
        parts.append(f'<g class="bilio-dot" data-dot="{side}">{path}</g>')
    else:
        letter = {0: 'b', 1: 'b', 2: 'i-left', 4: 'l', 5: 'i-right', 7: 'o'}[i]
        parts.append(f'<g data-solid="true" data-letter="{letter}">{path}</g>')
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -620 1802.78 1480.12" role="img" aria-labelledby="bilio-title bilio-desc" fill="currentColor">\n'
svg += '<title id="bilio-title">Bilio</title>\n<desc id="bilio-desc">Two dots rebound from soft lettering that gently compresses and springs back at each impact.</desc>\n'
svg += '\n'.join(parts) + '\n</svg>'
engine = (root / 'wordmark-physics.js').read_text()
# Scripted SVG: open directly or embed with object. An img cannot run SVG scripts.
standalone = svg.replace('</svg>', '<script><![CDATA[\n' + engine + '\nBilioPhysics.mount(document.documentElement);\n]]></script></svg>')
(root / 'assets/Bilio_Wordmark.animated.svg').write_text(standalone)
template = (root / 'preview.template.html').read_text()
(root / 'wordmark.html').write_text(template.replace('<!-- WORDMARK -->', svg).replace('<!-- PHYSICS -->', '<script>\n' + engine + '\n</script>'))
# The physics checks must run this exact engine, not a cached earlier version.
check = root / 'tests/physics.html'
version = hashlib.sha256(engine.encode()).hexdigest()[:12]
check.write_text(re.sub(r'src="\.\./wordmark-physics\.js(?:\?v=[^"]*)?"',
                       f'src="../wordmark-physics.js?v={version}"', check.read_text()))
