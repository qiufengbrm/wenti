"""Read roster JSON on stdin and emit assignments on stdout."""
import json
import sys
from collections import defaultdict

from ortools.sat.python import cp_model


def solve(data):
    candidates = data["candidates"]
    shifts = data["shifts"]
    model = cp_model.CpModel()
    assignments = {}
    by_user_day = defaultdict(list)
    by_user = defaultdict(list)
    for shift in shifts:
        variables = []
        for user_id in candidates:
            if user_id not in shift["eligible"]:
                continue
            variable = model.NewBoolVar(f"a_{shift['key']}_{user_id}")
            assignments[(shift["key"], user_id)] = variable
            by_user_day[(user_id, shift["date"])].append(variable)
            by_user[user_id].append(variable)
            variables.append(variable)
        model.Add(sum(variables) <= shift["requiredCount"])

    for variables in by_user_day.values():
        model.Add(sum(variables) <= 1)

    totals = []
    for user_id in candidates:
        total = model.NewIntVar(0, len(shifts), f"total_{user_id}")
        model.Add(total == sum(by_user[user_id]))
        totals.append(total)
    gap = model.NewIntVar(0, len(shifts), "fairness_gap")
    if totals:
        maximum = model.NewIntVar(0, len(shifts), "maximum")
        minimum = model.NewIntVar(0, len(shifts), "minimum")
        model.AddMaxEquality(maximum, totals)
        model.AddMinEquality(minimum, totals)
        model.Add(gap == maximum - minimum)
    else:
        model.Add(gap == 0)

    # One filled position outweighs the maximum possible fairness gain.
    model.Maximize((len(shifts) + 1) * sum(assignments.values()) - gap)
    engine = cp_model.CpSolver()
    engine.parameters.max_time_in_seconds = 20
    engine.parameters.num_search_workers = 4
    status = engine.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("排班求解失败")
    return {shift["key"]: [user_id for user_id in candidates
            if (shift["key"], user_id) in assignments
            and engine.Value(assignments[(shift["key"], user_id)])]
            for shift in shifts}


if __name__ == "__main__":
    try:
        print(json.dumps(solve(json.load(sys.stdin)), ensure_ascii=False))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
