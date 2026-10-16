import sys
import json
import os
import subprocess
import pypdf

def process_file(file_path, output_dir, target_date):
    result = {
        'success': True,
        'page_count': 1,
        'total_file_pages': 1,
        'preview_images': [],
        'pages_text': [],
        'full_text': ''
    }

    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        try:
            reader = pypdf.PdfReader(file_path)
            total_pages = len(reader.pages)
            result['total_file_pages'] = total_pages
            # CRITICAL RULE: If uploading PDF has more than 1 page, consider ONLY page 1!
            result['page_count'] = 1

            first_page_text = ''
            if total_pages > 0:
                first_page_text = reader.pages[0].extract_text() or ''
            
            result['pages_text'] = [{
                'page': 1,
                'text': first_page_text
            }]
            result['full_text'] = first_page_text

            # Generate preview image for ONLY page 1 using pdftoppm (-f 1 -l 1)
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            prefix = os.path.join(output_dir, f"{base_name}_preview")
            try:
                subprocess.run(
                    ['pdftoppm', '-png', '-r', '150', '-f', '1', '-l', '1', file_path, prefix],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                # Find generated page 1 image
                possible = [
                    f"{prefix}-1.png",
                    f"{prefix}-01.png",
                    f"{prefix}-001.png",
                    f"{prefix}.png"
                ]
                for p in possible:
                    if os.path.exists(p):
                        rel_path = os.path.relpath(p, 'public').replace('\\', '/')
                        result['preview_images'].append('/' + rel_path)
                        break
            except Exception as e:
                pass

        except Exception as e:
            result['success'] = False
            result['error'] = str(e)
    else:
        # Image file (jpg, png)
        result['page_count'] = 1
        result['total_file_pages'] = 1
        rel_path = os.path.relpath(file_path, 'public').replace('\\', '/')
        result['preview_images'].append('/' + rel_path)
        result['full_text'] = ''

    return result

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'success': False, 'error': 'Missing arguments'}))
        sys.exit(1)

    file_path = sys.argv[1]
    output_dir = sys.argv[2]
    target_date = sys.argv[3] if len(sys.argv) > 3 else ''

    os.makedirs(output_dir, exist_ok=True)
    out = process_file(file_path, output_dir, target_date)
    print(json.dumps(out))
