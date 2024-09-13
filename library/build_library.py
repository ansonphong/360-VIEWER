import os
import json
import struct
import hashlib
from pathlib import Path
from PIL import Image
from tqdm import tqdm
import piexif
import piexif.helper
import xml.etree.ElementTree as ET

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
    xmp_template = f'''<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"
    GPano:ProjectionType="equirectangular"
    GPano:UsePanoramaViewer="True"
    GPano:CroppedAreaImageWidthPixels="{width}"
    GPano:CroppedAreaImageHeightPixels="{height}"
    GPano:FullPanoWidthPixels="{width}"
    GPano:FullPanoHeightPixels="{height}"
    GPano:CroppedAreaLeftPixels="0"
    GPano:CroppedAreaTopPixels="0"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''.encode('utf-8')
    return xmp_template

def insert_xmp_metadata(image_path, xmp_metadata):
    try:
        with open(image_path, 'rb') as f:
            data = f.read()
        
        app1_marker = b'\xFF\xE1'
        xmp_header = b'http://ns.adobe.com/xap/1.0/\x00'
        
        # Remove existing XMP metadata
        while True:
            xmp_start = data.find(app1_marker + b'\x00\x00' + xmp_header)
            if xmp_start == -1:
                break
            xmp_length = struct.unpack('>H', data[xmp_start+2:xmp_start+4])[0]
            data = data[:xmp_start] + data[xmp_start + 2 + xmp_length:]
        
        # Prepare new XMP metadata
        xmp_length = len(xmp_metadata) + 2 + len(xmp_header)
        new_xmp_segment = app1_marker + struct.pack('>H', xmp_length) + xmp_header + xmp_metadata
        
        # Find the position to insert XMP (after SOI and APP0)
        soi_app0_end = data.find(b'\xFF\xD8\xFF\xE0')
        if soi_app0_end == -1:
            soi_app0_end = 2  # Assume it's right after SOI if we can't find APP0
        else:
            soi_app0_end += 18
        
        new_data = data[:soi_app0_end] + new_xmp_segment + data[soi_app0_end:]
        
        with open(image_path, 'wb') as f:
            f.write(new_data)
        
        print(f"XMP metadata inserted successfully in {image_path}")
    except Exception as e:
        print(f"Error inserting XMP metadata in {image_path}: {str(e)}")

def verify_xmp(image_path):
    try:
        with open(image_path, 'rb') as f:
            data = f.read()
        
        app1_marker = b'\xFF\xE1'
        xmp_header = b'http://ns.adobe.com/xap/1.0/\x00'
        
        xmp_start = data.find(app1_marker)
        while xmp_start != -1:
            if data[xmp_start+4:xmp_start+4+len(xmp_header)] == xmp_header:
                xmp_length = struct.unpack('>H', data[xmp_start+2:xmp_start+4])[0]
                xmp_data = data[xmp_start+4+len(xmp_header):xmp_start+2+xmp_length].decode('utf-8', errors='ignore')
                
                if 'GPano:ProjectionType' in xmp_data and 'GPano:UsePanoramaViewer' in xmp_data:
                    print(f"XMP metadata found and verified in {image_path}")
                    return
            
            xmp_start = data.find(app1_marker, xmp_start + 1)
        
        print(f"No valid XMP metadata found in {image_path}")
    except Exception as e:
        print(f"Error verifying XMP metadata in {image_path}: {str(e)}")

def generate_gpano_metadata(width, height):
    return {
        'GPano:ProjectionType': 'equirectangular',
        'GPano:UsePanoramaViewer': 'True',
        'GPano:CroppedAreaImageWidthPixels': str(width),
        'GPano:CroppedAreaImageHeightPixels': str(height),
        'GPano:FullPanoWidthPixels': str(width),
        'GPano:FullPanoHeightPixels': str(height),
        'GPano:CroppedAreaLeftPixels': '0',
        'GPano:CroppedAreaTopPixels': '0'
    }


def insert_gpano_metadata(image_path, gpano_metadata):
    try:
        with open(image_path, 'rb') as f:
            data = f.read()
        
        app1_marker = b'\xFF\xE1'
        xmp_header = b'http://ns.adobe.com/xap/1.0/\x00'
        
        xmp_template = f'''<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:GPano="http://ns.google.com/photos/1.0/panorama/">
   <GPano:ProjectionType>{gpano_metadata['GPano:ProjectionType']}</GPano:ProjectionType>
   <GPano:UsePanoramaViewer>{gpano_metadata['GPano:UsePanoramaViewer']}</GPano:UsePanoramaViewer>
   <GPano:CroppedAreaImageWidthPixels>{gpano_metadata['GPano:CroppedAreaImageWidthPixels']}</GPano:CroppedAreaImageWidthPixels>
   <GPano:CroppedAreaImageHeightPixels>{gpano_metadata['GPano:CroppedAreaImageHeightPixels']}</GPano:CroppedAreaImageHeightPixels>
   <GPano:FullPanoWidthPixels>{gpano_metadata['GPano:FullPanoWidthPixels']}</GPano:FullPanoWidthPixels>
   <GPano:FullPanoHeightPixels>{gpano_metadata['GPano:FullPanoHeightPixels']}</GPano:FullPanoHeightPixels>
   <GPano:CroppedAreaLeftPixels>{gpano_metadata['GPano:CroppedAreaLeftPixels']}</GPano:CroppedAreaLeftPixels>
   <GPano:CroppedAreaTopPixels>{gpano_metadata['GPano:CroppedAreaTopPixels']}</GPano:CroppedAreaTopPixels>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''.encode('utf-8')

        xmp_len_bytes = struct.pack('>H', len(xmp_template) + 2 + len(xmp_header))
        new_chunk = app1_marker + xmp_len_bytes + xmp_header + xmp_template

        # Find the position to insert the new XMP chunk
        soi_marker = data[:2]
        after_soi = data[2:]
        app0_start = after_soi.find(b'\xFF\xE0')
        if app0_start != -1:
            insert_pos = app0_start + 2
        else:
            insert_pos = 0

        # Construct the new image data
        new_data = soi_marker + after_soi[:insert_pos] + new_chunk + after_soi[insert_pos:]

        with open(image_path, 'wb') as f:
            f.write(new_data)
        
        print(f"GPano metadata inserted successfully in {image_path}")
    except Exception as e:
        print(f"Error inserting GPano metadata in {image_path}: {str(e)}")

        


def verify_gpano(image_path):
    try:
        with open(image_path, 'rb') as f:
            data = f.read()
        
        app1_marker = b'\xFF\xE1'
        xmp_header = b'http://ns.adobe.com/xap/1.0/\x00'
        
        xmp_start = data.find(app1_marker + b'\x00\x00' + xmp_header)
        if xmp_start == -1:
            print(f"No XMP metadata found in {image_path}")
            return
        
        xmp_length = struct.unpack('>H', data[xmp_start+2:xmp_start+4])[0]
        xmp_data = data[xmp_start+4+len(xmp_header):xmp_start+2+xmp_length].decode('utf-8', errors='ignore')
        
        root = ET.fromstring(xmp_data)
        ns = {'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'GPano': 'http://ns.google.com/photos/1.0/panorama/'}
        
        desc = root.find('.//rdf:Description', ns)
        if desc is None:
            print(f"No RDF Description found in XMP metadata of {image_path}")
            return
        
        gpano_tags = ['ProjectionType', 'UsePanoramaViewer', 'CroppedAreaImageWidthPixels',
                      'CroppedAreaImageHeightPixels', 'FullPanoWidthPixels', 'FullPanoHeightPixels',
                      'CroppedAreaLeftPixels', 'CroppedAreaTopPixels']
        
        for tag in gpano_tags:
            value = desc.get(f'{{http://ns.google.com/photos/1.0/panorama/}}{tag}')
            if value is None:
                print(f"GPano:{tag} not found in {image_path}")
                return
        
        print(f"GPano metadata verified successfully in {image_path}")
    except Exception as e:
        print(f"Error verifying GPano metadata in {image_path}: {str(e)}")

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
                    
                    gpano_metadata = generate_gpano_metadata(width, new_height if width != 2 * height else height)
                    
                    for path, quality in [(q100_path, 100), (q75_path, 75), (q50_path, 50)]:
                        os.makedirs(os.path.dirname(path), exist_ok=True)
                        img.save(path, "JPEG", quality=quality)
                        
                        insert_gpano_metadata(path, gpano_metadata)
                        verify_gpano(path)
                    
                    pbar.update(3)
            except Exception as e:
                print(f"\nError generating JPGs for {original_path}: {str(e)}")

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