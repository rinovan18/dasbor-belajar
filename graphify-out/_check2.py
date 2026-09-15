import json
from pathlib import Path
g = json.loads(Path("graphify-out/graph.json").read_text(encoding="utf-8"))
print("graph.json nodes:", len(g.get("nodes", [])))
print("graph.json edges:", len(g.get("edges", [])))
labels = json.loads(Path("graphify-out/.graphify_labels.json").read_text(encoding="utf-8"))
print("labels count:", len(labels))
analysis = json.loads(Path("graphify-out/.graphify_analysis.json").read_text(encoding="utf-8"))
print("analysis communities:", len(analysis.get("communities", {})))
print("analysis gods count:", len(analysis.get("gods", [])))
