import csv
from pathlib import Path


def main() -> None:
    project_dir = Path(__file__).resolve().parent
    spend_log_path = project_dir / "output" / "spend_log.csv"

    if not spend_log_path.exists():
        print("No spend log found.")
        return

    total_spend = 0.0
    run_count = 0

    with spend_log_path.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            value = row.get("total_estimated_cost_usd", "0") or "0"
            try:
                total_spend += float(value)
                run_count += 1
            except ValueError:
                continue

    print(f"Runs counted: {run_count}")
    print(f"Total estimated spend: ${total_spend:.6f}")


if __name__ == "__main__":
    main()
