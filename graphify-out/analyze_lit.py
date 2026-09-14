import json
from pathlib import Path

# Load graph
graph_data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))

# Find edges involving 'lit'
print('=== Edges involving lit ===')
lit_edges = []
for edge in graph_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    if 'lit' in source.lower() or 'lit' in target.lower():
        lit_edges.append(edge)

for e in lit_edges[:20]:
    print(f"  {e['source']} --[{e.get('label', 'related')}]--> {e['target']}")

print()
print('=== Edges involving IntegratedForum ===')
if_edges = []
for edge in graph_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    if 'IntegratedForum' in source or 'IntegratedForum' in target:
        if_edges.append(edge)

for e in if_edges[:20]:
    print(f"  {e['source']} --[{e.get('label', 'related')}]--> {e['target']}")

print()
print('=== Edges involving ModularQuiz ===')
mq_edges = []
for edge in graph_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    if 'ModularQuiz' in source or 'ModularQuiz' in target:
        mq_edges.append(edge)

for e in mq_edges[:15]:
    print(f"  {e['source']} --[{e.get('label', 'related')}]--> {e['target']}")

print()
print('=== Edges involving QuizDashboard ===')
qd_edges = []
for edge in graph_data.get('edges', []):
    source = edge.get('source', '')
    target = edge.get('target', '')
    if 'QuizDashboard' in source or 'QuizDashboard' in target:
        qd_edges.append(edge)

for e in qd_edges[:15]:
    print(f"  {e['source']} --[{e.get('label', 'related')}]--> {e['target']}")