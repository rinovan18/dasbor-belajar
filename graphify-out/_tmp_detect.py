import json
from pathlib import Path
d=json.loads(Path("graphify-out/.graphify_detect.json").read_text(encoding="utf-8"))
print(f"total_files={d['total_files']} total_words={d['total_words']}")
for k,v in d["files"].items():
    print(f"{k}: {len(v)} files")
