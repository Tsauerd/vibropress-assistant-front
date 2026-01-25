import os

# Папки, которые мы НЕ хотим видеть
IGNORE = {'.git', '.venv', 'venv', '__pycache__', '.idea', '.vscode', 'urllib3'}

def print_tree(dir_path, prefix=''):
    try:
        # Получаем список файлов и сортируем их
        items = sorted(os.listdir(dir_path))
    except PermissionError:
        return

    # Разделяем на папки и файлы для красоты
    dirs = [d for d in items if os.path.isdir(os.path.join(dir_path, d)) and d not in IGNORE]
    files = [f for f in items if os.path.isfile(os.path.join(dir_path, f)) and f not in IGNORE]
    
    entries = dirs + files # Сначала папки, потом файлы
    
    for i, entry in enumerate(entries):
        is_last = (i == len(entries) - 1)
        connector = "└── " if is_last else "├── "
        
        print(f"{prefix}{connector}{entry}")
        
        if entry in dirs:
            extension = "    " if is_last else "│   "
            print_tree(os.path.join(dir_path, entry), prefix + extension)

if __name__ == "__main__":
    print(f"📂 Структура проекта: {os.path.basename(os.getcwd())}")
    print_tree(".")