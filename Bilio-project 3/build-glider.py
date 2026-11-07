"""Build Deployer from one continuous outline, with transparent blinking eyes."""
from pathlib import Path
import xml.etree.ElementTree as ET
import re

ROOT = Path(__file__).parent
NS = {'svg': 'http://www.w3.org/2000/svg'}
source = ET.parse(ROOT / 'assets/bilio_deployer.silhouette.svg').getroot()
silhouette = source.find('svg:path', NS).get('d')
wordmark = ET.parse(ROOT / 'assets/Bilio_Wordmark.original.svg').getroot()
dot = wordmark.findall('svg:path', NS)[3].get('d')

def dot_path(x, y, width):
    """Place the original dot's Bezier curves into a single compound path."""
    scale = width / 111.82
    commands = []
    for command, coordinates in re.findall(r'([MmCcSsHhZz])([^MmCcSsHhZz]*)', dot.split('Z')[0] + 'Z'):
        values = [float(n) for n in re.findall(r'[-+]?(?:\d*\.\d+|\d+)', coordinates)]
        if command.islower():
            values = [n * scale for n in values]
        elif command != 'Z':
            values = [(n - (668.3 if i % 2 == 0 else 255.6)) * scale + (x if i % 2 == 0 else y)
                      for i, n in enumerate(values)]
        commands.append(command + ' '.join(f'{n:.6f}'.rstrip('0').rstrip('.') if n else '0' for n in values))
    return ''.join(commands)

# A single compound path for static use: one outer contour, eye cutouts and pupils.
static_path = ' '.join([silhouette, dot_path(109.93,40.82,17.44),
                       dot_path(134.86,40.82,17.44), dot_path(111.18,40.53,11.78),
                       dot_path(133.67,40.53,11.78)])
solid = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244.85 181.98" role="img" aria-labelledby="deployer-title">
  <title id="deployer-title">Deployer, the Bilio mascot</title>
  <path fill="#000000" fill-rule="evenodd" d="{static_path}"/>
</svg>
'''
(ROOT / 'assets/bilio_deployer.solid.svg').write_text(solid)

def eye(x, y, width, side):
    scale = width / 111.82
    return f'<g class="blink {side}"><g transform="translate({x} {y}) scale({scale:.10f}) translate(-668.3 -255.6)"><use href="#bilio-eye-dot"/></g></g>'

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="326.47" height="242.64" viewBox="0 0 244.85 181.98" role="img" aria-labelledby="glider-title glider-desc">
  <title id="glider-title">Deployer, the Bilio mascot</title>
  <desc id="glider-desc">A single continuous sugar glider silhouette with transparent eyes that blink softly.</desc>
  <style>
    .blink {{ animation: bilio-blink 9s linear infinite; transform-box: view-box; }}
    .left {{ transform-origin: 109.93px 40.82px; }}
    .right {{ transform-origin: 134.86px 40.82px; }}
    @keyframes bilio-blink {{
      0%, 29%, 32%, 74%, 77%, 79%, 82%, 100% {{ transform: scaleY(1); }}
      30%, 30.5%, 75%, 75.5%, 80%, 80.5% {{ transform: scaleY(.065); }}
    }}
    svg[data-paused="true"] .blink {{ animation-play-state: paused; }}
    @media (prefers-reduced-motion: reduce) {{ .blink {{ animation: none; }} }}
  </style>
  <defs>
    <!-- Exact Bezier outline of the first i-dot, uniformly scaled for each eye. -->
    <path id="bilio-eye-dot" d="{dot}"/>
    <mask id="glider-eye-openings" x="0" y="0" width="244.85" height="181.98" maskUnits="userSpaceOnUse" style="mask-type: luminance">
      <rect width="244.85" height="181.98" fill="white"/>
      <g fill="black">{eye(109.93,40.82,17.44,'left')}{eye(134.86,40.82,17.44,'right')}</g>
      <g fill="white">{eye(111.18,40.53,11.78,'left')}{eye(133.67,40.53,11.78,'right')}</g>
    </mask>
  </defs>
  <path fill="#000000" d="{silhouette}" mask="url(#glider-eye-openings)"/>
</svg>'''
(ROOT / 'assets/bilio_deployer.blink.svg').write_text(svg)
for name in ('Bilio_Sugar_Glider_Transparent.svg', 'assets/Bilio_Sugar_Glider_Transparent.svg'):
    (ROOT / name).write_text(svg)
template = (ROOT / 'glider.template.html').read_text()
(ROOT / 'glider.html').write_text(template.replace('<!-- GLIDER -->', svg))
