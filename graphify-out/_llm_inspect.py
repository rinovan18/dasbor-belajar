from pathlib import Path
import inspect
import graphify.llm as m
print(Path(m.__file__).read_text(encoding="utf-8")[:6000])
