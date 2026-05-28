"""GUI for Icon Maker."""

import os
import json
import tkinter as tk
from tkinter import filedialog, ttk
from pathlib import Path
from typing import List
import threading

from icon_maker import generate_icons


CONFIG_FILE = os.path.expanduser("~/.icon_maker_config.json")


def load_config() -> dict:
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {"output_dir": "", "size": "512"}


def save_config(config: dict):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f)
    except:
        pass


class IconMakerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Icon Maker")
        self.root.configure(bg="#ffffff")
        self.root.geometry("440x560")
        self.root.resizable(False, False)
        
        self.input_files: List[str] = []
        self.config = load_config()
        self.is_processing = False
        
        self._create_ui()
        self._center_window()
        
        if self.config.get("output_dir"):
            self.dir_var.set(self.config["output_dir"])
        if self.config.get("size"):
            self.size_var.set(self.config["size"])
    
    def _create_ui(self):
        main = tk.Frame(self.root, bg="#ffffff")
        main.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header = tk.Frame(main, bg="#ffffff")
        header.pack(fill=tk.X, padx=24, pady=(24, 8))
        
        tk.Label(header, text="Icon Maker", font=("Arial", 24, "bold"), 
                bg="#ffffff", fg="#000000").pack(anchor=tk.W)
        
        tk.Label(header, text="Create PNG, ICO, ICNS icons from SVG/PNG", 
                font=("Arial", 11), bg="#ffffff", fg="#666666").pack(anchor=tk.W, pady=(4, 0))
        
        # Drop zone
        drop = tk.Frame(main, bg="#f5f5f5", relief="solid", bd=1)
        drop.pack(fill=tk.X, padx=24, pady=(16, 8))
        
        drop_btn = tk.Button(drop, text="Select Images (SVG/PNG)", font=("Arial", 13),
                            bg="#f5f5f5", fg="#007aff", relief="flat", bd=0,
                            pady=40, command=self._browse)
        drop_btn.pack(fill=tk.BOTH, expand=True)
        
        self.drop_label = tk.Label(main, text="", font=("Arial", 11), 
                                   bg="#ffffff", fg="#333333")
        self.drop_label.pack(pady=(0, 8))
        
        # Settings
        opts = tk.Frame(main, bg="#ffffff")
        opts.pack(fill=tk.X, padx=24, pady=(8, 8))
        
        # Size row
        size_row = tk.Frame(opts, bg="#ffffff")
        size_row.pack(fill=tk.X, pady=(0, 12))
        
        tk.Label(size_row, text="Icon Size:", font=("Arial", 12), 
                bg="#ffffff").pack(side=tk.LEFT)
        
        self.size_var = tk.StringVar(value="512")
        size_cb = ttk.Combobox(size_row, textvariable=self.size_var, 
                               values=["256", "512", "1024"],
                               state="readonly", width=8, font=("Arial", 11))
        size_cb.pack(side=tk.RIGHT)
        
        # Output folder row
        dir_row = tk.Frame(opts, bg="#ffffff")
        dir_row.pack(fill=tk.X, pady=(0, 12))
        
        tk.Label(dir_row, text="Output:", font=("Arial", 12), 
                bg="#ffffff").pack(side=tk.LEFT)
        
        self.dir_var = tk.StringVar()
        dir_entry = tk.Entry(dir_row, textvariable=self.dir_var, font=("Arial", 11))
        dir_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 8))
        
        tk.Button(dir_row, text="Browse", font=("Arial", 10),
                 command=self._browse_dir).pack(side=tk.RIGHT)
        
        # Formats row
        fmt_row = tk.Frame(opts, bg="#ffffff")
        fmt_row.pack(fill=tk.X)
        
        tk.Label(fmt_row, text="Formats:", font=("Arial", 12), 
                bg="#ffffff").pack(side=tk.LEFT)
        
        fmt_frame = tk.Frame(fmt_row, bg="#ffffff")
        fmt_frame.pack(side=tk.RIGHT)
        
        self.png_var = tk.BooleanVar(value=True)
        tk.Checkbutton(fmt_frame, text="PNG", variable=self.png_var, font=("Arial", 11),
                       bg="#ffffff").pack(side=tk.LEFT, padx=(0, 12))
        
        self.ico_var = tk.BooleanVar(value=True)
        tk.Checkbutton(fmt_frame, text="ICO", variable=self.ico_var, font=("Arial", 11),
                       bg="#ffffff").pack(side=tk.LEFT, padx=(0, 12))
        
        self.icns_var = tk.BooleanVar(value=True)
        tk.Checkbutton(fmt_frame, text="ICNS", variable=self.icns_var, font=("Arial", 11),
                       bg="#ffffff").pack(side=tk.LEFT)
        
        # Action buttons
        btn_frame = tk.Frame(main, bg="#ffffff")
        btn_frame.pack(fill=tk.X, padx=24, pady=(16, 0))
        
        self.add_btn = tk.Button(btn_frame, text="Add More Files", font=("Arial", 12),
                                bg="#e0e0e0", fg="#333333", relief="flat",
                                pady=10, command=self._browse)
        self.add_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        
        self.clear_btn = tk.Button(btn_frame, text="Clear", font=("Arial", 12),
                                  bg="#e0e0e0", fg="#333333", relief="flat",
                                  pady=10, command=self._clear)
        self.clear_btn.pack(side=tk.RIGHT)
        
        # Generate button
        self.gen_btn = tk.Button(main, text="Generate Icons", font=("Arial", 14, "bold"),
                                bg="#007aff", fg="#ffffff", relief="flat",
                                pady=14, command=self._generate)
        self.gen_btn.pack(fill=tk.X, padx=24, pady=(12, 0))
        
        # Status
        self.status = tk.Label(main, text="Ready", font=("Arial", 11),
                              bg="#ffffff", fg="#888888")
        self.status.pack(pady=(12, 20))
    
    def _center_window(self):
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() - 440) // 2
        y = (self.root.winfo_screenheight() - 560) // 2
        self.root.geometry(f"440x560+{x}+{y}")
    
    def _browse(self):
        files = filedialog.askopenfilenames(
            title="Select Images",
            filetypes=[
                ("Images", "*.svg *.png *.jpg *.jpeg"),
                ("SVG", "*.svg"),
                ("PNG", "*.png"),
                ("All", "*.*")
            ]
        )
        if files:
            for f in files:
                if f not in self.input_files:
                    self.input_files.append(f)
            self._update()
    
    def _browse_dir(self):
        path = filedialog.askdirectory(title="Select Output Directory")
        if path:
            self.dir_var.set(path)
    
    def _clear(self):
        self.input_files = []
        self._update()
    
    def _update(self):
        count = len(self.input_files)
        if count == 0:
            self.drop_label.config(text="")
        elif count == 1:
            name = Path(self.input_files[0]).name
            self.drop_label.config(text=f"Selected: {name}")
        else:
            self.drop_label.config(text=f"Selected: {count} files")
    
    def _generate(self):
        if self.is_processing:
            return
        
        if not self.input_files:
            self.status.config(text="Please select files first", fg="#cc0000")
            return
        
        output_dir = self.dir_var.get().strip()
        if not output_dir or not os.path.isdir(output_dir):
            self.status.config(text="Please select output directory", fg="#cc0000")
            return
        
        formats = []
        if self.png_var.get(): formats.append("png")
        if self.ico_var.get(): formats.append("ico")
        if self.icns_var.get(): formats.append("icns")
        
        if not formats:
            self.status.config(text="Please select at least one format", fg="#cc0000")
            return
        
        size = int(self.size_var.get())
        
        self.config["output_dir"] = output_dir
        self.config["size"] = str(size)
        save_config(self.config)
        
        self.is_processing = True
        self._set_ui_processing(True)
        
        total = len(self.input_files)
        
        def run():
            success = 0
            for i, f in enumerate(self.input_files):
                self.root.after(0, lambda i=i: self.status.config(
                    text=f"Processing {i+1}/{total}...", fg="#007aff"))
                try:
                    generate_icons(f, output_dir=output_dir, size=size, formats=formats)
                    success += 1
                except Exception as e:
                    print(f"Error: {f} - {e}")
            
            self.root.after(0, lambda s=success, t=total: self._done(s, t))
        
        threading.Thread(target=run, daemon=True).start()
    
    def _set_ui_processing(self, processing: bool):
        state = tk.DISABLED if processing else tk.NORMAL
        self.gen_btn.config(state=state, bg="#888888" if processing else "#007aff")
        self.add_btn.config(state=state, bg="#cccccc" if processing else "#e0e0e0")
        self.clear_btn.config(state=state, bg="#cccccc" if processing else "#e0e0e0")
        self.is_processing = processing
    
    def _done(self, success: int, total: int):
        self._set_ui_processing(False)
        if success == total:
            self.status.config(text=f"Done! {success} icons generated", fg="#008800")
        else:
            self.status.config(text=f"Done: {success}/{total} succeeded", fg="#ff8800")


def main():
    root = tk.Tk()
    app = IconMakerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
