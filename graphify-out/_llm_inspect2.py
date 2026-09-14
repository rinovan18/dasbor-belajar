from pathlib import Path
import graphify.llm as m
txt = Path(m.__file__).read_text(encoding="utf-8")
# write to file to avoid cp1252
Path("graphify-out/_llm.txt").write_text(txt[:8000], encoding="utf-8")
print("written")
print(txt[:2000].encode("ascii", "ignore").decode())
