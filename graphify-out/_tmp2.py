import pathlib
p = pathlib.Path("graphify-out/.graphify_detect.json")
raw = p.read_bytes()
print(raw[:100])
# try utf-8-sig
import json
try:
    txt = raw.decode("utf-8-sig")
    d=json.loads(txt)
    print("ok", d["total_files"], d["total_words"])
except Exception as e:
    print("err", e)
