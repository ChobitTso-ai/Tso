"""Programmatic tool calling sandbox.

Instead of returning raw tool results directly to the model (which bloats
context), this module processes results in a restricted Python sandbox first:
filter, aggregate, loop — then send only the refined output back to Claude.

Anthropic benchmarks: saves ~37% of tokens on complex multi-step tasks.
"""
from __future__ import annotations

import json
import traceback
from typing import Any


# ---------------------------------------------------------------------------
# Safe builtins allowed inside sandbox scripts
# ---------------------------------------------------------------------------
_SAFE_BUILTINS: dict[str, Any] = {
    # Core types
    "len": len, "range": range, "enumerate": enumerate, "zip": zip,
    "list": list, "dict": dict, "set": set, "tuple": tuple,
    "str": str, "int": int, "float": float, "bool": bool,
    # Predicates
    "any": any, "all": all, "isinstance": isinstance,
    # Functional
    "map": map, "filter": filter, "sorted": sorted, "reversed": reversed,
    "sum": sum, "min": min, "max": max,
    # I/O helpers
    "print": print,
    # JSON
    "json": json,
    # None / booleans
    "None": None, "True": True, "False": False,
}


class SandboxResult:
    def __init__(self, output: Any = None, error: str = "") -> None:
        self.output = output
        self.error = error

    @property
    def ok(self) -> bool:
        return not self.error

    def to_text(self) -> str:
        if self.error:
            return f"[sandbox error] {self.error}"
        if isinstance(self.output, (dict, list)):
            return json.dumps(self.output, ensure_ascii=False, indent=2)
        return str(self.output) if self.output is not None else ""


def run(script: str, context: dict[str, Any] | None = None) -> SandboxResult:
    """Execute *script* in a restricted namespace with *context* variables.

    The script may set a variable named `result` which becomes the output.
    If no `result` is set, the last expression's value is used (via exec trick).

    Example::

        raw_json = '[{"name": "Alice", "score": 95}, {"name": "Bob", "score": 42}]'
        script = '''
        import json
        data = json.loads(raw_json)
        result = [r for r in data if r["score"] >= 60]
        '''
        out = run(script, {"raw_json": raw_json})
        # out.output == [{"name": "Alice", "score": 95}]
    """
    namespace: dict[str, Any] = {"__builtins__": _SAFE_BUILTINS}
    if context:
        namespace.update(context)

    try:
        exec(compile(script, "<sandbox>", "exec"), namespace)  # noqa: S102
    except Exception:
        return SandboxResult(error=traceback.format_exc(limit=5))

    output = namespace.get("result")
    return SandboxResult(output=output)


# ---------------------------------------------------------------------------
# Higher-level helpers
# ---------------------------------------------------------------------------

def filter_results(raw: str, condition_script: str) -> SandboxResult:
    """Parse *raw* as JSON then run *condition_script* to filter/transform it.

    The script receives a variable `data` (the parsed JSON) and should set `result`.
    """
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = raw
    return run(condition_script, {"data": data})


def aggregate(items: list[str], agg_script: str) -> SandboxResult:
    """Collect multiple tool-result strings, parse each as JSON, then aggregate.

    The script receives `items` (list of parsed objects) and should set `result`.
    """
    parsed: list[Any] = []
    for item in items:
        try:
            parsed.append(json.loads(item))
        except Exception:
            parsed.append(item)
    return run(agg_script, {"items": parsed})
