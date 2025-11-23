"""
Phong 360 Viewer - Library Builder v3.0
Generates optimized image library with multiple resolution variants

Features:
- Configurable resolution presets (8K, 4K, 2K)
- Adaptive loading support with bandwidth metadata
- Extensible resolution system (no hardcoded keys)
- Smart resizing (never upscales)
- File size tracking for bandwidth estimation
- Supports nested folder structures

Version: 3.0.0
"""

import os
import json
import hashlib
from pathlib import Path
from PIL import Image
from tqdm import tqdm
import argparse
from datetime import datetime

# Default resolution presets (can be overridden by config file)
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

def load_config(config_file):
    """Load configuration from JSON file"""
    if os.path.exists(config_file):
        with open(config_file, 'r') as f:
            return json.load(f)
    return None

def generate_short_hash(data, length=8):
    """Generate a short hash ID from string data"""
    return hashlib.sha256(data.encode()).hexdigest()[:length]

def get_image_metadata(image_path):
    """Extract metadata from image file"""
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

def generate_resolution_variants(image_path, presets, output_dir, rel_path):
    """
    Generate multiple resolution variants of an image
    
    Returns:
        list: Array of resolution variant metadata
    """
    variants = []
    
    try:
        with Image.open(image_path) as img:
            # Convert RGBA to RGB
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            original_width, original_height = img.size
            
            # Generate base filename
            base_filename = rel_path.replace('/', '-').replace(' ', '-')
            base_filename = os.path.splitext(base_filename)[0]
            
            # Sort presets by size (largest first)
            sorted_presets = sorted(
                presets.items(),
                key=lambda x: x[1]['width'],
                reverse=True
            )
            
            for preset_id, preset_config in sorted_presets:
                target_width = preset_config['width']
                target_height = preset_config['height']
                
                # Don't upscale - skip if target is larger than original
                if target_width > original_width:
                    continue
                
                # Calculate actual dimensions maintaining aspect ratio
                actual_width = target_width
                actual_height = target_height
                
                # Resize image
                resized = img.resize((actual_width, actual_height), Image.Resampling.LANCZOS)
                
                # Save with quality setting
                output_path = os.path.join(output_dir, preset_id, f"{base_filename}.jpg")
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                resized.save(output_path, "JPEG", quality=preset_config['quality'])
                
                # Get file size
                file_size = os.path.getsize(output_path)
                
                # Build variant metadata
                variant = {
                    'id': preset_id.lower(),
                    'label': preset_config['label'],
                    'width': actual_width,
                    'height': actual_height,
                    'path': f"_BUILD/{preset_id}/{base_filename}.jpg",
                    'fileSize': file_size,
                    'quality': preset_config['quality'],
                    'recommended': preset_config['recommended'],
                    'bandwidth': preset_config['bandwidth']
                }
                
                # Mark default resolution
                if preset_config.get('default', False):
                    variant['default'] = True
                
                variants.append(variant)
    
    except Exception as e:
        print(f"\nError generating variants for {image_path}: {str(e)}")
    
    return variants

def generate_thumbnail(image_path, thumbnail_config, output_dir, rel_path):
    """Generate thumbnail for library browsing"""
    try:
        with Image.open(image_path) as img:
            # Convert RGBA to RGB
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            # Create thumbnail
            img.thumbnail((thumbnail_config['width'], thumbnail_config['height']))
            
            # Generate filename
            thumbnail_name = rel_path.replace('/', '-').replace(' ', '-')
            thumbnail_name = os.path.splitext(thumbnail_name)[0] + '.jpg'
            thumbnail_path = os.path.join(output_dir, 'thumbnails', thumbnail_name)
            
            os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
            img.save(thumbnail_path, "JPEG", quality=thumbnail_config['quality'])
            
            return {
                'path': f"_BUILD/thumbnails/{thumbnail_name}",
                'width': img.width,
                'height': img.height
            }
    except Exception as e:
        print(f"\nError generating thumbnail for {image_path}: {str(e)}")
        return None

def scan_directory(root_dir, presets, thumbnail_config, include_metadata=True):
    """
    Scan directory for images and build library structure
    
    Returns:
        dict: Library in v3.0 format with resolutions array
    """
    library = {
        '_metadata': {
            'version': '3.0.0',
            'generated': datetime.now().isoformat(),
            'total_images': 0,
            'total_categories': 0,
            'image_format': 'equirectangular',
            'resolution_presets': {
                preset_id.lower(): {
                    'width': config['width'],
                    'height': config['height'],
                    'quality': config['quality'],
                    'label': config['label'],
                    'bandwidth': config['bandwidth']
                }
                for preset_id, config in presets.items()
            }
        },
        '_categories': {}
    }
    
    total_files = sum([len(files) for r, d, files in os.walk(root_dir) if '_BUILD' not in r])
    image_count = 0
    category_count = 0
    
    with tqdm(total=total_files, desc="Processing images") as pbar:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Skip the _BUILD folder and other output/processing folders
            if any(skip in dirpath for skip in ['_BUILD', '/output', '/tiles', 'tiles_diffused', '/temp', '/cache']):
                continue
            
            rel_path = os.path.relpath(dirpath, root_dir)
            if rel_path == '.':
                rel_path = ''
            
            image_files = [f for f in filenames if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            if image_files:
                # Determine category (top-level folder)
                path_parts = rel_path.split(os.sep) if rel_path else []
                category_name = path_parts[0] if path_parts else 'Root'
                
                # Ensure category exists
                if category_name not in library['_categories']:
                    library['_categories'][category_name] = {
                        'name': category_name,
                        'images': []
                    }
                    category_count += 1
                
                category_data = library['_categories'][category_name]
                
                # Process each image
                for image_file in image_files:
                    name_without_extension = os.path.splitext(image_file)[0]
                    file_path = os.path.join(rel_path, image_file).replace(os.sep, '/') if rel_path else image_file
                    full_path = os.path.join(root_dir, file_path)
                    
                    # Generate unique ID
                    hash_id = generate_short_hash(file_path)
                    
                    # Generate thumbnail
                    thumbnail = generate_thumbnail(full_path, thumbnail_config, os.path.join(root_dir, '_BUILD'), file_path)
                    
                    # Generate resolution variants
                    resolutions = generate_resolution_variants(full_path, presets, os.path.join(root_dir, '_BUILD'), file_path)
                    
                    # Build image entry
                    image_entry = {
                        'id': hash_id,
                        'name': name_without_extension,
                        'filename': image_file,
                        'path': file_path,
                        'thumbnail': thumbnail,
                        'resolutions': resolutions
                    }
                    
                    # Add metadata if requested
                    if include_metadata:
                        metadata = get_image_metadata(full_path)
                        if metadata:
                            image_entry['metadata'] = metadata
                    
                    category_data['images'].append(image_entry)
                    image_count += 1
                    
                    pbar.update(1)
            
            # Update progress for non-image files
            pbar.update(len(filenames) - len(image_files))
    
    # Update metadata
    library['_metadata']['total_images'] = image_count
    library['_metadata']['total_categories'] = category_count
    
    return library

def write_library_json(library, output_file, pretty=True):
    """Write library to JSON file"""
    with open(output_file, 'w') as f:
        if pretty:
            json.dump(library, f, indent=2)
        else:
            json.dump(library, f)
    
    print(f"Library written to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Build 360 image library with adaptive resolution system v3.0')
    parser.add_argument('--root', '-r', default='./', help='Root directory to scan (default: ./)')
    parser.add_argument('--output', '-o', default='library.json', help='Output JSON file (default: library.json)')
    parser.add_argument('--config', '-c', default='../resolutions.json', help='Resolution config file (default: ../resolutions.json)')
    parser.add_argument('--no-metadata', action='store_true', help='Exclude image metadata from output')
    parser.add_argument('--compact', action='store_true', help='Output compact JSON (no pretty-print)')
    
    args = parser.parse_args()
    
    root_dir = args.root
    output_file = args.output
    
    # Load configuration
    config = load_config(args.config)
    if config:
        print(f"Loaded configuration from: {args.config}")
        presets = config.get('presets', DEFAULT_PRESETS)
        thumbnail_config = config.get('thumbnail', DEFAULT_THUMBNAIL)
    else:
        print("Using default configuration")
        presets = DEFAULT_PRESETS
        thumbnail_config = DEFAULT_THUMBNAIL
    
    print(f"\n{'='*60}")
    print(f"Phong 360 Viewer - Library Builder v3.0")
    print(f"{'='*60}\n")
    print(f"Scanning directory: {os.path.abspath(root_dir)}")
    print(f"Resolution presets: {', '.join(presets.keys())}")
    print(f"Include metadata: {not args.no_metadata}\n")
    
    # Scan directory and generate library
    library = scan_directory(root_dir, presets, thumbnail_config, include_metadata=not args.no_metadata)
    
    print(f"\nFound {library['_metadata']['total_images']} images in {library['_metadata']['total_categories']} categories")
    
    # Write output
    print(f"\nWriting library file...")
    write_library_json(library, output_file, pretty=not args.compact)
    
    print(f"\n{'='*60}")
    print(f"✓ Library build complete!")
    print(f"{'='*60}\n")
    print(f"Generated:")
    print(f"  - {output_file} (v3.0 format)")
    print(f"  - _BUILD/ folder with {len(presets)} resolution variants + thumbnails")
    print(f"\nResolution variants generated:")
    for preset_id, preset in presets.items():
        print(f"  - {preset_id}: {preset['width']}x{preset['height']} @ Q{preset['quality']}")

if __name__ == '__main__':
    main()
