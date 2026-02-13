#!/usr/bin/env python3
"""Extract and join hard/soft metrics into commit-data.js for the website."""

import json
import os

DATA_ROOT = "/Users/fortuna/Desktop/Colab/ICML_paper_ISO/everything_analysis_data"
OUTPUT = "/Users/fortuna/Desktop/Colab/ICML_paper_ISO/lossfunk_stuff/website/static/js/commit-data.js"

# Hard metrics use "tool" field with these names
HARD_AGENT_MAP = {
    "claude_code": "claude_code",
    "codex": "codex_cli",
    "codex_cli": "codex_cli",
    "trae_sonnet": "trae_sonnet",
    "trae_gpt5": "trae_gpt5",
}

# Soft metrics use "agent" + "model" fields
SONNET_MODELS = {"us-anthropic-claude-sonnet-4-5-20250929-v1-0", "us.anthropic.claude-sonnet-4-5-20250929-v1:0"}
GPT5_MODELS = {"gpt-5", "gpt-5-merged", "gpt-5-2025-08-07"}

AGENT_DISPLAY = {
    "claude_code": "Claude Code",
    "codex_cli": "Codex CLI",
    "trae_sonnet": "TRAE (Sonnet)",
    "trae_gpt5": "TRAE (GPT-5)",
}


def normalize_hard_agent(name):
    return HARD_AGENT_MAP.get(name, name)


def resolve_soft_agent(meta):
    """Resolve agent key from soft metrics meta, handling trae model disambiguation."""
    agent = meta.get("agent", "")
    model = meta.get("model", "")
    model_full = meta.get("model_full", "")

    if agent == "claude_code":
        return "claude_code"
    elif agent in ("codex", "codex_cli"):
        return "codex_cli"
    elif agent == "trae":
        if model in SONNET_MODELS or model_full in SONNET_MODELS:
            return "trae_sonnet"
        elif model in GPT5_MODELS or model_full in GPT5_MODELS:
            return "trae_gpt5"
        return "trae_unknown"
    return agent


def compute_quadrant(hard_cls, bottleneck_cat):
    soft_pass = bottleneck_cat in ("same_target", "related_target")
    hard_pass = hard_cls in ("beats", "similar")
    if soft_pass and hard_pass:
        return "Q1"
    elif soft_pass and not hard_pass:
        return "Q2"
    elif not soft_pass and hard_pass:
        return "Q3"
    else:
        return "Q4"


def load_json(path):
    with open(path) as f:
        return json.load(f)


def extract_soft_fields(entry):
    pq = entry.get("patch_quality", {})
    bt = pq.get("bottleneck_target", {})
    ac = pq.get("approach_comparison", {})

    bottleneck = bt.get("category", "unknown")
    approach = ac.get("category", "unknown")
    discussion = bt.get("discussion", "") or ac.get("discussion", "")

    if len(discussion) > 200:
        discussion = discussion[:197] + "..."

    return bottleneck, approach, discussion


def build_project_data(project):
    hard_data = load_json(os.path.join(DATA_ROOT, "hard_metrics", project, "hard_metrics.json"))
    soft_data = load_json(os.path.join(DATA_ROOT, "soft_metrics", project, "soft_metrics.json"))

    # Index hard metrics by (commit, agent)
    hard_index = {}
    for h in hard_data:
        key = (h["commit"], normalize_hard_agent(h.get("tool", "")))
        hard_index[key] = h

    # Index soft metrics by (commit, agent) — resolve trae model
    soft_index = {}
    for s in soft_data:
        meta = s.get("meta", {})
        commit = meta.get("commits", {}).get("human", "")[:8]
        agent = resolve_soft_agent(meta)
        if commit and agent:
            soft_index[(commit, agent)] = s

    # Use hard metrics commits as canonical set (they define the benchmark)
    all_commits = set(h["commit"] for h in hard_data)

    commits_list = []
    approach_counts = {}

    for commit in sorted(all_commits):
        agents_data = {}
        for agent_key in ["claude_code", "codex_cli", "trae_sonnet", "trae_gpt5"]:
            hard_entry = hard_index.get((commit, agent_key), {})
            soft_entry = soft_index.get((commit, agent_key), {})

            hard_cls = hard_entry.get("hard_classification", "NO_DATA")
            primary_pct = hard_entry.get("primary_pct")
            primary_metric = hard_entry.get("primary_metric", "none")
            throughput_pct = hard_entry.get("throughput_pct")
            ttft_pct = hard_entry.get("ttft_pct")

            if soft_entry:
                bottleneck, approach, discussion = extract_soft_fields(soft_entry)
            else:
                bottleneck, approach, discussion = "unknown", "unknown", ""

            quadrant = compute_quadrant(hard_cls, bottleneck)

            if agent_key not in approach_counts:
                approach_counts[agent_key] = {}
            approach_counts[agent_key][approach] = approach_counts[agent_key].get(approach, 0) + 1

            agents_data[agent_key] = {
                "quadrant": quadrant,
                "hard": hard_cls,
                "primary_pct": round(primary_pct, 1) if primary_pct is not None else None,
                "primary_metric": primary_metric,
                "throughput_pct": round(throughput_pct, 1) if throughput_pct is not None else None,
                "ttft_pct": round(ttft_pct, 1) if ttft_pct is not None else None,
                "bottleneck": bottleneck,
                "approach": approach,
                "summary": discussion,
            }

        commits_list.append({"hash": commit, "agents": agents_data})

    return {"commits": commits_list, "approach_counts": approach_counts}


def main():
    data = {
        "vllm": build_project_data("vllm"),
        "sglang": build_project_data("sglang"),
    }

    js_content = "// Auto-generated by build_commit_data.py\nwindow.ISO_BENCH_DATA = " + json.dumps(data, separators=(',', ':')) + ";\n"

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        f.write(js_content)

    for project in ["vllm", "sglang"]:
        n = len(data[project]["commits"])
        print(f"{project}: {n} commits")
        for agent, counts in sorted(data[project]["approach_counts"].items()):
            print(f"  {agent}: {counts}")


if __name__ == "__main__":
    main()
