"""Build a self-contained, offline copy of Bilio for sharing."""
import base64
from pathlib import Path
import re
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'output'


def data_uri(path, mime):
    encoded = base64.b64encode((ROOT / path).read_bytes()).decode('ascii')
    return f'data:{mime};base64,{encoded}'


def replace_once(pattern, replacement, text):
    result, count = re.subn(pattern, lambda match: replacement, text, count=1)
    if count != 1:
        raise ValueError(f'Could not find expected page resource: {pattern}')
    return result


subprocess.run([sys.executable, str(ROOT / 'build-site.py')], check=True)
page = (ROOT / 'index.html').read_text(encoding='utf-8')
css = (ROOT / 'styles.css').read_text(encoding='utf-8')
for font in ('IBMPlexMono-Regular.ttf', 'IBMPlexMono-Italic.ttf'):
    path = f'assets/fonts/{font}'
    css = css.replace(f'"{path}"', f'"{data_uri(path, "font/ttf")}"')

page = replace_once(r'<link rel="preload"[^>]*>', '', page)
page = replace_once(r'<link rel="stylesheet"[^>]*>', f'<style>\n{css}</style>', page)
for path, mime in (('favicon.ico', 'image/x-icon'), ('assets/favicon.svg', 'image/svg+xml')):
    page = replace_once(r'href="' + re.escape(path) + r'(?:\?[^"<>]*)?"',
                        f'href="{data_uri(path, mime)}"', page)

# Inline classic scripts run immediately, so put them after the page's elements.
scripts = []
for path in ('wordmark-physics.js', 'website.js'):
    page = replace_once(r'<script src="' + re.escape(path) + r'(?:\?[^"<>]*)?" defer></script>',
                        '', page)
    script = (ROOT / path).read_text(encoding='utf-8')
    script = re.sub(r'</script', r'<\\/script', script, flags=re.I)
    scripts.append(f'<script>\n{script}</script>')
page = page.replace('</body>', '\n'.join(scripts) + '\n</body>')

# Carry the font license even if the HTML is shared without its ZIP.
license_text = (ROOT / 'assets/fonts/OFL.txt').read_text(encoding='utf-8')
page = page.replace('</head>', '<!--\nIBM Plex Mono font license\n' +
                    license_text.replace('--', '- -') + '\n-->\n</head>')

instructions = """BILIO — OFFLINE PREVIEW

1. Extract/unzip this folder.
2. Double-click Bilio.html to open it in your web browser.
   If it opens in an editor, right-click and choose Open With > your browser.

No installation, internet connection, or local server is needed.
Fonts, artwork, and animations are embedded in Bilio.html.

Click the downward caret to reveal About, and the upward caret to return.
This is a snapshot of the website at the time it was packaged.

IBM Plex Mono is included under the accompanying Open Font License.
"""

OUTPUT.mkdir(exist_ok=True)
html_path = OUTPUT / 'Bilio.html'
html_path.write_text(page, encoding='utf-8')
zip_path = OUTPUT / 'Bilio-preview.zip'
with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as archive:
    archive.writestr('Bilio/Bilio.html', page.encode('utf-8'))
    archive.writestr('Bilio/READ-ME.txt', instructions.encode('utf-8'))
    archive.write(ROOT / 'assets/fonts/OFL.txt', 'Bilio/IBM-Plex-Mono-License.txt')

print(f'Created {html_path}')
print(f'Created {zip_path} ({zip_path.stat().st_size / 1024:.0f} KB)')
