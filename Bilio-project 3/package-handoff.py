"""Package editable source, deployment files, and an offline viewing copy."""
from pathlib import Path
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'output'
SOURCE_FILES = (
    '.gitignore', 'README.md', 'HANDOFF.md', 'netlify.toml', '_redirects',
    'website.template.html', 'styles.css', 'website.js', 'wordmark-physics.js',
    'index.html', 'favicon.ico',
    'build-site.py', 'build-preview.py', 'build-glider.py', 'build-deploy.py',
    'package-preview.py', 'package-handoff.py',
    'preview.template.html', 'glider.template.html', 'wordmark.html', 'glider.html',
    'Bilio_Sugar_Glider_Transparent.svg',
)

for script in ('build-deploy.py', 'package-preview.py'):
    subprocess.run([sys.executable, str(ROOT / script)], check=True)

OUTPUT.mkdir(exist_ok=True)
archive_path = OUTPUT / 'Bilio-client-handoff.zip'
with ZipFile(archive_path, 'w', compression=ZIP_DEFLATED) as archive:
    for name in SOURCE_FILES:
        archive.write(ROOT / name, f'Bilio-project/{name}')
    for directory in ('assets', 'tests', 'dist'):
        for source in sorted((ROOT / directory).rglob('*')):
            if source.is_file() and not any(part.startswith('.') or part == '__pycache__'
                                            for part in source.relative_to(ROOT).parts):
                archive.write(source, f'Bilio-project/{source.relative_to(ROOT).as_posix()}')
    archive.write(OUTPUT / 'Bilio.html', 'Bilio-project/preview/Bilio.html')

print(f'Created {archive_path} ({archive_path.stat().st_size / 1024:.0f} KB).')
