import json
from pathlib import Path

# Load graph
graph_data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))

# Find edges involving key nodes
key_ids = ['lit', 'package_dependencies_lit', 'lib_kuis_ledakan_modularquiz', 'dasbor_kuis_quizdashboard', 'lib_diskusi_tugas_integratedforum']

print('=== All edges in graph ===')
for edge in graph_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    # Check if any key node is involved
    for key in key_ids:
        if key in source or key in target:
            print(f"  {source} --[{edge.get('label', 'related')}]--> {target}")
            break