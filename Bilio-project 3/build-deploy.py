"""Build the static files to publish. Python is only used during the build."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
PUBLIC_FILES = (
    '_redirects',
    'index.html',
    'styles.css',
    'website.js',
    'wordmark-physics.js',
    'favicon.ico',
    'assets/favicon.svg',
    'assets/fonts/IBMPlexMono-Regular.ttf',
    'assets/fonts/IBMPlexMono-Italic.ttf',
    'assets/fonts/OFL.txt',
)

subprocess.run([sys.executable, str(ROOT / 'build-site.py')], check=True)
if DIST.exists():
    shutil.rmtree(DIST)
for name in PUBLIC_FILES:
    destination = DIST / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, destination)
print(f'Built {DIST} with {len(PUBLIC_FILES)} public files.')
