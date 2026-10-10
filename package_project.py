#!/usr/bin/env python3
"""
Automated Project Packaging Script
Bundles the Smart Hospital Emergency Communication Network into a clean ZIP archive
excluding node_modules and temporary build artifacts.
"""

import os
import zipfile
import datetime

def package_project():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"Smart_Hospital_Emergency_Network_{timestamp}.zip"
    
    exclude_dirs = {'.git', 'node_modules', '.system_generated', 'scratch', '.gemini'}
    exclude_extensions = {'.pyc', '.log'}

    print(f"Packaging project into: {zip_filename}...")
    file_count = 0

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Exclude specified directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]

            for file in files:
                if any(file.endswith(ext) for ext in exclude_extensions) or file == zip_filename:
                    continue
                
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, '.')
                zipf.write(filepath, arcname)
                file_count += 1

    file_size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
    print(f"Successfully packaged {file_count} files into '{zip_filename}' ({file_size_mb:.2f} MB).")
    return zip_filename

if __name__ == '__main__':
    package_project()
