import json
from pathlib import Path

# Load graph
graph_data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))

# Find nodes containing certain keywords
keywords = ['lit', 'LitElement', 'Integrated', 'Forum', 'Modular', 'Quiz', 'Dashboard', 'Dasbor']

print('=== Nodes containing keywords ===')
for node in graph_data.get('nodes', []):
    label = node.get('label', '')
    node_id = node.get('id', '')
    for kw in keywords:
        if kw.lower() in label.lower() or kw.lower() in node_id.lower():
            print(f"  ID: {node_id}")
            print(f"    Label: {label}")
            print(f"    Type: {node.get('type', 'unknown')}")
            print()
            break