# Graph Report - .  (2026-09-16)

## Corpus Check
- 102 files · ~93,133 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 90 nodes · 73 edges · 36 communities (6 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Package Config
- Runtime Dependencies
- Build Scripts
- Dev Dependencies
- Keywords & Tags
- Repository Info
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35

## God Nodes (most connected - your core abstractions)
1. `scripts` - 9 edges
2. `keywords` - 4 edges
3. `repository` - 3 edges
4. `author` - 2 edges
5. `@haxtheweb/d-d-d` - 2 edges
6. `@haxtheweb/i18n-manager` - 2 edges
7. `canvas-confetti` - 2 edges
8. `lit` - 2 edges
9. `@babel/preset-env` - 2 edges
10. `@custom-elements-manifest/analyzer` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (36 total, 30 thin omitted)

### Community 0 - "Package Config"
Cohesion: 0.12
Nodes (15): author, name, customElements, description, hax, cli, license, main (+7 more)

### Community 1 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (9): canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager, lit, dependencies, canvas-confetti, @haxtheweb/d-d-d, @haxtheweb/i18n-manager (+1 more)

### Community 2 - "Build Scripts"
Cohesion: 0.22
Nodes (9): scripts, analyze, build, dddaudit, release, start, sync, test (+1 more)

### Community 3 - "Dev Dependencies"
Cohesion: 0.40
Nodes (5): babel-plugin-template-html-minifier, @open-wc/testing, devDependencies, babel-plugin-template-html-minifier, @open-wc/testing

### Community 4 - "Keywords & Tags"
Cohesion: 0.50
Nodes (4): keywords, haxtheweb, lit, webcomponents

### Community 5 - "Repository Info"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **61 isolated node(s):** `name`, `version`, `description`, `license`, `name` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Package Config`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`?**
  _High betweenness centrality (0.458) - this node is a cross-community bridge._
- **Why does `scripts` connect `Build Scripts` to `Package Config`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Config`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._