# Create 360 Gallery

Guide the user through setting up a new 360 panoramic image gallery using the Phong 360 Viewer engine.

## Steps

1. Ask the user for gallery details:
   - Gallery name / title
   - Subtitle
   - Domain (if known)
   - Profile type: profile (with avatar/links) or local (simple)
   - Theme preference: dark, light, or auto
   - Accent color (hex, default: #6366f1)
   - Social links (if profile type)

2. Determine the target directory. If not in a gallery directory already, ask where to create it.

3. Initialize the directory:
   ```bash
   git init
   git submodule add https://github.com/ansonphong/360-VIEWER.git 360-viewer
   cp -r 360-viewer/gallery-template/* .
   cp 360-viewer/gallery-template/.gitignore .
   ```

4. Generate a customized `360-viewer.json` based on the user's answers.

5. Customize `index.html`:
   - Update `<title>` and meta tags
   - Add Google Analytics if provided
   - Update og:image and og:url if domain is known

6. Ask the user to add their equirectangular 360 images to `library/` subdirectories.

7. Once images are added, run the build:
   ```bash
   pip install Pillow tqdm
   python 360-viewer/library/build_library.py \
     --root library/ \
     --output library/library.json \
     --config 360-viewer.json
   ```

8. Start a local server for testing:
   ```bash
   python -m http.server 8000
   ```

9. Provide deployment instructions (Netlify recommended).

## Reference

- Gallery template: `gallery-template/`
- Full guide: `docs/FORK-GUIDE.md`
- Library format: `docs/LIBRARY-FORMAT.md`
- API reference: `docs/API.md`
