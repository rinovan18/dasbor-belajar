import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path("."))
Path("graphify-out/.graphify_detect.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"total_files": result["total_files"], "total_words": result["total_words"], "code": len(result["files"].get("code",[])), "document": len(result["files"].get("document",[])), "paper": len(result["files"].get("paper",[])), "image": len(result["files"].get("image",[])), "video": len(result["files"].get("video",[]))}, indent=2))
