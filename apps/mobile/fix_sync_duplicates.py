import os
import shutil
import re

def cleanup_duplicates(root_path):
    print(f"🧹 Starting comprehensive cleanup in: {root_path}")
    count_renames = 0
    count_deletes = 0

    # Pattern to match " 2", " 3", " 4", etc. or " 2.ext", etc.
    pattern = re.compile(r" \d+(\..+)?$")

    for dirpath, dirnames, filenames in os.walk(root_path, topdown=False):
        # Handle files
        for filename in filenames:
            match = pattern.search(filename)
            if match:
                old_file_path = os.path.join(dirpath, filename)
                new_filename = pattern.sub(match.group(1) if match.group(1) else "", filename)
                new_file_path = os.path.join(dirpath, new_filename)

                if os.path.exists(new_file_path):
                    if os.path.getsize(new_file_path) == 0 and os.path.getsize(old_file_path) > 0:
                        # Original is empty, duplicate has content, so replace it!
                        print(f"📦 Replacing empty original {new_filename} with {filename}")
                        os.replace(old_file_path, new_file_path)
                        count_renames += 1
                    else:
                        print(f"🗑️ Deleting redundant duplicate file: {filename}")
                        os.remove(old_file_path)
                        count_deletes += 1
                else:
                    print(f"🏷️ Renaming file: {filename} -> {new_filename}")
                    os.rename(old_file_path, new_file_path)
                    count_renames += 1

        # Handle directories
        for dirname in dirnames:
            match = pattern.search(dirname)
            if match:
                old_dir_path = os.path.join(dirpath, dirname)
                new_dirname = pattern.sub("", dirname)
                new_dir_path = os.path.join(dirpath, new_dirname)

                if os.path.exists(new_dir_path):
                    # Check if original is empty
                    if not os.listdir(new_dir_path) and os.listdir(old_dir_path):
                         print(f"📦 Replacing empty original dir {new_dirname} with {dirname}")
                         shutil.rmtree(new_dir_path)
                         os.rename(old_dir_path, new_dir_path)
                         count_renames += 1
                    else:
                        print(f"🗑️ Deleting redundant duplicate directory: {dirname}")
                        shutil.rmtree(old_dir_path)
                        count_deletes += 1
                else:
                    print(f"🏷️ Renaming directory: {dirname} -> {new_dirname}")
                    os.rename(old_dir_path, new_dir_path)
                    count_renames += 1

    print(f"\n✨ Cleanup finished!")
    print(f"✅ Fixed: {count_renames}")
    print(f"🗑️ Deleted: {count_deletes}")

if __name__ == "__main__":
    target = "/Users/vivaswanshetty/Documents/Projects/elevatex-mobileapp/elevatex-mobile/apps/mobile"
    if os.path.exists(target):
        cleanup_duplicates(target)
