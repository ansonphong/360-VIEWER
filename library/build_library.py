import os
import json
import hashlib
from pathlib import Path
from PIL import Image
from tqdm import tqdm
import piexif
import piexif.helper

def generate_short_hash(data, length=8):
    return hashlib.sha256(data.encode()).hexdigest()[:length]

def scan_directory(root_dir):
    library = {}
    missing_thumbnails = []
    missing_jpgs = []
    total_files = sum([len(files) for r, d, files in os.walk(root_dir) if '_BUILD' not in r])
    
    with tqdm(total=total_files, desc="Scanning files") as pbar:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            if '_BUILD' in dirpath:
                continue
            
            rel_path = os.path.relpath(dirpath, root_dir)
            if rel_path == '.':
                rel_path = ''
            
            image_files = [f for f in filenames if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            if image_files:
                path_parts = rel_path.split(os.sep)
                current_level = library
                
                for part in path_parts:
                    if part not in current_level:
                        current_level[part] = {}
                    current_level = current_level[part]
                
                if 'files' not in current_level:
                    current_level['files'] = []
                
                for image_file in image_files:
                    name_without_extension = os.path.splitext(image_file)[0]
                    file_path = os.path.join(rel_path, image_file).replace(os.sep, '/')
                    thumbnail_path, thumbnail_filename = generate_thumbnail_path(root_dir, file_path)
                    q100_path, q100_filename = generate_jpg_path(root_dir, file_path, 'Q100')
                    q75_path, q75_filename = generate_jpg_path(root_dir, file_path, 'Q75')
                    q50_path, q50_filename = generate_jpg_path(root_dir, file_path, 'Q50')
                    
                    hash_id = generate_short_hash(file_path)
                    
                    file_info = {
                        'id': hash_id,
                        'name': name_without_extension,
                        'path': file_path,
                        'thumbnail': thumbnail_filename,
                        'Q100': q100_filename,
                        'Q75': q75_filename,
                        'Q50': q50_filename
                    }
                    current_level['files'].append(file_info)
                    
                    if not os.path.exists(thumbnail_path):
                        missing_thumbnails.append((os.path.join(root_dir, file_path), thumbnail_path))
                    
                    if not os.path.exists(q100_path) or not os.path.exists(q75_path) or not os.path.exists(q50_path):
                        missing_jpgs.append((os.path.join(root_dir, file_path), q100_path, q75_path, q50_path))
                    
                    pbar.update(1)
            
            pbar.update(len(filenames) - len(image_files))
    
    return library, missing_thumbnails, missing_jpgs

def generate_thumbnail_path(root_dir, file_path):
    thumbnail_name = file_path.replace('/', '-').replace(' ', '-')
    thumbnail_name = os.path.splitext(thumbnail_name)[0] + '.jpg'
    full_path = os.path.join(root_dir, '_BUILD', 'thumbnails', thumbnail_name).replace(os.sep, '/')
    return full_path, f"_BUILD/thumbnails/{thumbnail_name}"

def generate_jpg_path(root_dir, file_path, quality):
    jpg_name = file_path.replace('/', '-').replace(' ', '-')
    jpg_name = os.path.splitext(jpg_name)[0] + '.jpg'
    full_path = os.path.join(root_dir, '_BUILD', f'{quality}', jpg_name).replace(os.sep, '/')
    return full_path, f"_BUILD/{quality}/{jpg_name}"

def generate_thumbnails(missing_thumbnails):
    with tqdm(total=len(missing_thumbnails), desc="Generating thumbnails") as pbar:
        for original_path, thumbnail_path in missing_thumbnails:
            try:
                with Image.open(original_path) as img:
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    
                    img.thumbnail((512, 256))  # Adjust size as needed
                    os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
                    img.save(thumbnail_path, "JPEG")
                pbar.update(1)
            except Exception as e:
                print(f"\nError generating thumbnail for {original_path}: {str(e)}")

def generate_xmp_metadata(width, height):
    xmp_dict = {
        'Xmp': {
            'GPano:ProjectionType': 'equirectangular',
            'GPano:UsePanoramaViewer': 'True',
            'GPano:CroppedAreaImageWidthPixels': str(width),
            'GPano:CroppedAreaImageHeightPixels': str(height),
            'GPano:FullPanoWidthPixels': str(width),
            'GPano:FullPanoHeightPixels': str(height),
            'GPano:CroppedAreaLeftPixels': '0',
            'GPano:CroppedAreaTopPixels': '0',
        }
    }
    return piexif.helper.UserComment.dump(json.dumps(xmp_dict))

def insert_xmp_metadata(image_path, xmp_metadata):
    exif_dict = piexif.load(image_path)
    exif_dict["Exif"][piexif.ExifIFD.UserComment] = xmp_metadata
    exif_bytes = piexif.dump(exif_dict)
    piexif.insert(exif_bytes, image_path)

def generate_JPGs(missing_jpgs):
    with tqdm(total=len(missing_jpgs) * 3, desc="Generating high-quality JPGs") as pbar:
        for original_path, q100_path, q75_path, q50_path in missing_jpgs:
            try:
                with Image.open(original_path) as img:
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    
                    width, height = img.size
                    if width != 2 * height:
                        new_height = width // 2
                        img = img.crop((0, 0, width, new_height))
                    
                    xmp_metadata = generate_xmp_metadata(width, new_height if width != 2 * height else height)
                    
                    for path, quality in [(q100_path, 100), (q75_path, 75), (q50_path, 50)]:
                        os.makedirs(os.path.dirname(path), exist_ok=True)
                        img.save(path, "JPEG", quality=quality)
                        
                        insert_xmp_metadata(path, xmp_metadata)
                        verify_xmp(path)
                    
                    pbar.update(3)
            except Exception as e:
                print(f"\nError generating JPGs for {original_path}: {str(e)}")

def verify_xmp(image_path):
    try:
        exif_dict = piexif.load(image_path)
        xmp_metadata = exif_dict["Exif"][piexif.ExifIFD.UserComment]
        xmp_dict = json.loads(piexif.helper.UserComment.load(xmp_metadata))
        
        if 'Xmp' not in xmp_dict or 'GPano:ProjectionType' not in xmp_dict['Xmp']:
            print(f"No XMP metadata found in {image_path}")
            return
        
        if xmp_dict['Xmp']['GPano:ProjectionType'] != 'equirectangular':
            print(f"ProjectionType mismatch in {image_path}")
        
        if xmp_dict['Xmp']['GPano:UsePanoramaViewer'] != 'True':
            print(f"UsePanoramaViewer mismatch in {image_path}")
        
        print(f"XMP metadata verified for {image_path}")
    except Exception as e:
        print(f"Error verifying XMP metadata for {image_path}: {str(e)}")

def write_library_json(library, output_file):
    with open(output_file, 'w') as f:
        json.dump(library, f, indent=2)

def main():
    root_dir = './'
    output_file = 'library.json'
    
    print(f"Scanning directory: {os.path.abspath(root_dir)}")
    library, missing_thumbnails, missing_jpgs = scan_directory(root_dir)
    
    print(f"Generating missing thumbnails...")
    generate_thumbnails(missing_thumbnails)
    
    print(f"Generating high-quality JPGs...")
    generate_JPGs(missing_jpgs)
    
    print(f"Writing library to: {output_file}")
    write_library_json(library, output_file)
    
    print("Library creation, thumbnail generation, and high-quality JPG generation complete.")

if __name__ == '__main__':
    main()