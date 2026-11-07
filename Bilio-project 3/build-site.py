"""Assemble the Bilio website from the existing animated vector assets."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parent

wordmark = (ROOT / 'assets/Bilio_Wordmark.animated.svg').read_text()
# Mount the shared physics engine once, from the page itself.
wordmark = re.sub(r'<script>.*?</script>', '', wordmark, flags=re.S)
wordmark = wordmark.replace('viewBox="-80 -620 1802.78 1480.12"',
                            'viewBox="0 0 1642.78 780.12"')
mascot = (ROOT / 'assets/bilio_deployer.blink.svg').read_text()
mascot = mascot.replace('fill="#010101"', 'fill="#000000"')
mascot = mascot.replace('Bilio sugar glider, blinking', 'Deployer, the Bilio mascot')

# A square, transparent icon preserves Deployer's silhouette in browser tabs.
favicon = (ROOT / 'assets/bilio_deployer.solid.svg').read_text()
favicon = re.sub(r'<\?xml.*?\?>', '', favicon)
favicon = re.sub(r'<svg[^>]*>',
                 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -39.435 260.85 260.85">',
                 favicon, count=1)
favicon = favicon.replace('#010101', '#000000')
(ROOT / 'assets/favicon.svg').write_text(favicon)

template = (ROOT / 'website.template.html').read_text()
page = template.replace('<!-- WORDMARK -->', wordmark).replace('<!-- DEPLOYER -->', mascot)
# Make a normal refresh pick up changed animation code and styles reliably.
for asset in ('wordmark-physics.js', 'website.js', 'styles.css', 'assets/favicon.svg', 'favicon.ico'):
    version = hashlib.sha256((ROOT / asset).read_bytes()).hexdigest()[:12]
    page = page.replace(f'"{asset}"', f'"{asset}?v={version}"')
(ROOT / 'index.html').write_text(page)
print('Built index.html with the animated wordmark and Deployer.')
