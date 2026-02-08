"""
Phong 360 Viewer - Library Builder v4.0
Generates v4.0 library.json with sections, context, and multi-resolution variants.

Features:
- v4.0 format: sections array, context object, per-image slugs
- Configurable resolution presets (8K, 4K, 2K)
- Adaptive loading support with bandwidth metadata
- Smart resizing (never upscales)
- File size tracking for bandwidth estimation
- Each directory becomes a section with configurable template

Version: 4.0.0
"""

import os
import json
import hashlib
import re
from pathlib import Path
from PIL import Image
from tqdm import tqdm
import argparse
from datetime import datetime

DEFAULT_PRESETS = {
    '8K': {
        'width': 8192,
        'height': 4096,
        'quality': 95,
        'label': '8K Ultra HD',
        'recommended': ['vr-headset', 'desktop-4k'],
        'bandwidth': 'high'
    },
    '4K': {
        'width': 4096,
        'height': 2048,
        'quality': 90,
        'label': '4K High Quality',
        'recommended': ['desktop', 'tablet'],
        'bandwidth': 'medium',
        'default': True
    },
    '2K': {
        'width': 2048,
        'height': 1024,
        'quality': 85,
        'label': '2K Standard',
        'recommended': ['mobile', 'slow-connection'],
        'bandwidth': 'low'
    }
}

DEFAULT_THUMBNAIL = {
    'width': 512,
    'height': 256,
    'quality': 80
}

SKIP_DIRS = ['_BUILD', 'output', 'tiles', 'tiles_diffused', 'temp', 'cache']


def load_config(config_file):
    if os.path.exists(config_file):
        with open(config_file, 'r') as f:
            return json.load(f)
    return None


def generate_short_hash(data, length=8):
    return hashlib.sha256(data.encode()).hexdigest()[:length]


def slugify(name):
    """Convert a filename/title to a URL-safe slug."""
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def clean_title(raw_title, section_overrides):
    """Clean up image title using section overrides."""
    title = raw_title

    # Apply titleStrip prefix removal
    title_strip = section_overrides.get('titleStrip', '')
    if title_strip and title.startswith(title_strip):
        title = title[len(title_strip):]

    # Extract MDVR date before stripping (for fallback)
    mdvr_match = re.search(r'MDVR-(\d{4})-(\d{2})-(\d{2})', title)
    mdvr_date = None
    if mdvr_match:
        mdvr_date = f"{mdvr_match.group(1)}-{mdvr_match.group(2)}-{mdvr_match.group(3)}"

    # Strip MDVR timestamp patterns: MDVR-YYYY-MM-DD-HH-MM-SS
    title = re.sub(r'-?MDVR-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}', '', title)

    # Strip Hextile suffixes: -Hextile_44_4K (possibly repeated)
    title = re.sub(r'(-Hextile_\d+_\d+[Kk])+', '', title)

    # Strip trailing hash suffixes like -33d4a9
    title = re.sub(r'-[0-9a-f]{6}$', '', title)

    # Strip trailing -2d_alpha suffixes
    title = re.sub(r'-2d_alpha$', '', title, flags=re.IGNORECASE)

    # Replace hyphens and underscores with spaces
    title = title.replace('-', ' ').replace('_', ' ')

    # Split camelCase: "MerkabaCoreV7Panorama" -> "Merkaba Core V7 Panorama"
    title = re.sub(r'([a-z])([A-Z])', r'\1 \2', title)
    title = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', title)
    title = re.sub(r'(\d)([A-Z])', r'\1 \2', title)

    # Collapse multiple spaces and strip
    title = re.sub(r'\s+', ' ', title).strip()

    # Title case
    if title:
        title = title.title()

    # Fallback: use MDVR date if available, then raw title
    if not title:
        if mdvr_date:
            title = mdvr_date
        else:
            title = raw_title

    return title


def get_image_metadata(image_path):
    try:
        with Image.open(image_path) as img:
            return {
                'originalWidth': img.width,
                'originalHeight': img.height,
                'format': img.format,
                'mode': img.mode,
                'isPanorama': img.width / img.height >= 1.8,
                'fileSize': os.path.getsize(image_path)
            }
    except Exception as e:
        print(f"\nError reading metadata for {image_path}: {str(e)}")
        return None


def generate_resolution_variants(image_path, presets, output_dir, rel_path, build_dir='_BUILD'):
    variants = []
    try:
        with Image.open(image_path) as img:
            if img.mode == 'RGBA':
                img = img.convert('RGB')

            original_width = img.size[0]
            base_filename = rel_path.replace('/', '-').replace(' ', '-')
            base_filename = os.path.splitext(base_filename)[0]

            sorted_presets = sorted(
                presets.items(),
                key=lambda x: x[1]['width'],
                reverse=True
            )

            for preset_id, preset_config in sorted_presets:
                target_width = preset_config['width']
                target_height = preset_config['height']

                if target_width > original_width:
                    continue

                resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
                output_path = os.path.join(output_dir, preset_id, f"{base_filename}.jpg")
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                resized.save(output_path, "JPEG", quality=preset_config['quality'])

                file_size = os.path.getsize(output_path)

                variant = {
                    'id': preset_id.lower(),
                    'label': preset_config['label'],
                    'width': target_width,
                    'height': target_height,
                    'path': f"{build_dir}/{preset_id}/{base_filename}.jpg",
                    'fileSize': file_size,
                    'quality': preset_config['quality'],
                    'recommended': preset_config['recommended'],
                    'bandwidth': preset_config['bandwidth']
                }

                if preset_config.get('default', False):
                    variant['default'] = True

                variants.append(variant)

    except Exception as e:
        print(f"\nError generating variants for {image_path}: {str(e)}")

    return variants


def generate_thumbnail(image_path, thumbnail_config, output_dir, rel_path, build_dir='_BUILD'):
    try:
        with Image.open(image_path) as img:
            if img.mode == 'RGBA':
                img = img.convert('RGB')

            img.thumbnail((thumbnail_config['width'], thumbnail_config['height']))

            thumbnail_name = rel_path.replace('/', '-').replace(' ', '-')
            thumbnail_name = os.path.splitext(thumbnail_name)[0] + '.jpg'
            thumbnail_path = os.path.join(output_dir, 'thumbnails', thumbnail_name)

            os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
            img.save(thumbnail_path, "JPEG", quality=thumbnail_config['quality'])

            return {
                'path': f"{build_dir}/thumbnails/{thumbnail_name}",
                'width': img.width,
                'height': img.height
            }
    except Exception as e:
        print(f"\nError generating thumbnail for {image_path}: {str(e)}")
        return None


def scan_directory(root_dir, presets, thumbnail_config, default_template, include_metadata=True, site_config=None, build_dir='_BUILD'):
    """Scan directory for images and build v4.0 library structure."""
    sections = []
    total_images = 0

    skip_dirs = list(SKIP_DIRS)
    if build_dir not in skip_dirs:
        skip_dirs.append(build_dir)

    total_files = sum(
        len(files) for r, d, files in os.walk(root_dir)
        if not any(skip in r for skip in skip_dirs)
    )

    with tqdm(total=total_files, desc="Processing images") as pbar:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            if any(skip in dirpath for skip in skip_dirs):
                continue

            rel_path = os.path.relpath(dirpath, root_dir)
            if rel_path == '.':
                rel_path = ''

            image_files = sorted(
                f for f in filenames
                if f.lower().endswith(('.png', '.jpg', '.jpeg'))
            )

            if image_files:
                path_parts = rel_path.split(os.sep) if rel_path else []
                section_name = path_parts[0] if path_parts else 'Root'
                section_id = slugify(section_name)

                # Check if section already exists
                existing = next((s for s in sections if s['id'] == section_id), None)
                if not existing:
                    section_overrides = {}
                    if site_config and 'sections' in site_config:
                        section_overrides = site_config['sections'].get(section_name, {})
                    existing = {
                        'id': section_id,
                        'title': section_overrides.get('title', section_name),
                        'template': section_overrides.get('template', default_template),
                        'icon': section_overrides.get('icon', 'folder'),
                        'images': []
                    }
                    sections.append(existing)

                for image_file in image_files:
                    name_without_ext = os.path.splitext(image_file)[0]

                    # Clean title using section overrides
                    section_overrides = {}
                    if site_config and 'sections' in site_config:
                        section_overrides = site_config['sections'].get(section_name, {})
                    title = clean_title(name_without_ext, section_overrides)

                    file_path = os.path.join(rel_path, image_file).replace(os.sep, '/') if rel_path else image_file
                    full_path = os.path.join(root_dir, file_path)

                    hash_id = generate_short_hash(file_path)
                    slug = slugify(name_without_ext)
                    thumbnail = generate_thumbnail(
                        full_path, thumbnail_config,
                        os.path.join(root_dir, build_dir), file_path,
                        build_dir=build_dir
                    )
                    resolutions = generate_resolution_variants(
                        full_path, presets,
                        os.path.join(root_dir, build_dir), file_path,
                        build_dir=build_dir
                    )

                    image_entry = {
                        'id': hash_id,
                        'title': title,
                        'slug': slug,
                        'thumbnail': thumbnail,
                        'resolutions': resolutions
                    }

                    if include_metadata:
                        metadata = get_image_metadata(full_path)
                        if metadata:
                            image_entry['metadata'] = metadata

                    existing['images'].append(image_entry)
                    total_images += 1

                    pbar.update(1)

            pbar.update(len(filenames) - len(image_files))

    return sections, total_images


def build_library(sections, total_images, context=None):
    """Build v4.0 library.json structure."""
    if context is None:
        context = {
            'type': 'local',
            'title': 'Library',
            'theme': 'auto'
        }

    return {
        'version': '4.0.0',
        'context': context,
        'sections': sections,
        'meta': {
            'totalImages': total_images,
            'generated': datetime.now().isoformat()
        }
    }


def write_library_json(library, output_file, pretty=True):
    with open(output_file, 'w') as f:
        if pretty:
            json.dump(library, f, indent=2)
        else:
            json.dump(library, f)
    print(f"Library written to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Build 360 image library v4.0'
    )
    parser.add_argument('--root', '-r', default='./',
                        help='Root directory to scan (default: ./)')
    parser.add_argument('--output', '-o', default='library.json',
                        help='Output JSON file (default: library.json)')
    parser.add_argument('--config', '-c', default=None,
                        help='360-viewer.json config file (context, sections, build settings)')
    parser.add_argument('--template', '-t', default='accordion',
                        help='Default section template (default: accordion)')
    parser.add_argument('--context', default=None,
                        help='Custom context JSON string \u2014 overridden by --config if both provided')
    parser.add_argument('--no-metadata', action='store_true',
                        help='Exclude image metadata from output')
    parser.add_argument('--compact', action='store_true',
                        help='Output compact JSON (no pretty-print)')

    args = parser.parse_args()

    # Load 360-viewer.json config
    site_config = None
    if args.config:
        site_config = load_config(args.config)
        if site_config:
            print(f"Loaded config from: {args.config}")
        else:
            print(f"Warning: Config file not found: {args.config}")

    # Resolve presets: hardcoded defaults -> config overrides
    presets = dict(DEFAULT_PRESETS)  # copy defaults
    thumbnail_config = dict(DEFAULT_THUMBNAIL)
    build_dir = '_BUILD'

    if site_config and 'build' in site_config:
        build_config = site_config['build']
        build_dir = build_config.get('outputDir', '_BUILD')
        # Merge resolution overrides on top of defaults
        if 'resolutions' in build_config:
            for preset_id, overrides in build_config['resolutions'].items():
                if preset_id in presets:
                    presets[preset_id] = {**presets[preset_id], **overrides}
                else:
                    presets[preset_id] = overrides
        if 'thumbnail' in build_config:
            thumbnail_config = {**thumbnail_config, **build_config['thumbnail']}

    # Resolve context: --config context wins, --context CLI is fallback
    context = None
    if site_config and 'context' in site_config:
        context = site_config['context']
    elif args.context:
        try:
            context = json.loads(args.context)
        except json.JSONDecodeError as e:
            print(f"Error parsing context JSON: {e}")
            return

    print(f"\n{'=' * 60}")
    print(f"Phong 360 Viewer - Library Builder v4.0")
    print(f"{'=' * 60}\n")
    print(f"Scanning directory: {os.path.abspath(args.root)}")
    print(f"Resolution presets: {', '.join(presets.keys())}")
    print(f"Default template:   {args.template}")
    print(f"Include metadata:   {not args.no_metadata}\n")

    # Scan and build
    sections, total_images = scan_directory(
        args.root, presets, thumbnail_config,
        args.template,
        include_metadata=not args.no_metadata,
        site_config=site_config,
        build_dir=build_dir
    )

    print(f"\nFound {total_images} images in {len(sections)} sections")

    library = build_library(sections, total_images, context)

    print(f"\nWriting library file...")
    write_library_json(library, args.output, pretty=not args.compact)

    print(f"\n{'=' * 60}")
    print(f"[OK] Library build complete!")
    print(f"{'=' * 60}\n")
    print(f"Generated:")
    print(f"  - {args.output} (v4.0 format)")
    print(f"  - {build_dir}/ folder with {len(presets)} resolution variants + thumbnails")
    print(f"\nResolution variants:")
    for preset_id, preset in presets.items():
        print(f"  - {preset_id}: {preset['width']}x{preset['height']} @ Q{preset['quality']}")


if __name__ == '__main__':
    main()
