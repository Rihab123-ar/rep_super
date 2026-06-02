import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

def main():
    tiers_fp = DATA_DIR / "tiers.csv"
    contrats_fp = DATA_DIR / "contrats.csv"
    sinistres_fp = DATA_DIR / "sinistres.csv"
    out_fp = DATA_DIR / "examples.xlsx"

    dfs = {}
    if tiers_fp.exists():
        dfs['tiers'] = pd.read_csv(tiers_fp)
    else:
        dfs['tiers'] = pd.DataFrame()

    if contrats_fp.exists():
        dfs['contrats'] = pd.read_csv(contrats_fp)
    else:
        dfs['contrats'] = pd.DataFrame()

    if sinistres_fp.exists():
        dfs['sinistres'] = pd.read_csv(sinistres_fp)
    else:
        dfs['sinistres'] = pd.DataFrame()

    with pd.ExcelWriter(out_fp, engine='openpyxl') as writer:
        for sheet, df in dfs.items():
            df.to_excel(writer, sheet_name=sheet, index=False)

    print(f"Wrote Excel: {out_fp}")

if __name__ == '__main__':
    main()
