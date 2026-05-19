import requests

r = requests.get("http://localhost:8000/features?with_stats=true")
data = r.json()

features_cherchees = [
    "declaration_tardive_15j",
    "declaration_tardive_30j", 
    "sinistre_moins_7j_apres_effet",
    "sinistre_moins_7j_expiration",
    "montant_3std_suspect",
    "montant_10x_prime",
]

print("=== FEATURES CRITIQUES ===")
for group in data["groups"]:
    for feat in group["features"]:
        if feat["feature"] in features_cherchees:
            stats = feat.get("stats", {})
            print(f"  ✅ {feat['feature']:40s} "
                  f"moy={stats.get('mean','N/A')} "
                  f"nonzero={stats.get('pct_nonzero','N/A')}%")

# Afficher les manquantes
trouvees = set()
for group in data["groups"]:
    for feat in group["features"]:
        if feat["feature"] in features_cherchees:
            trouvees.add(feat["feature"])

manquantes = set(features_cherchees) - trouvees
if manquantes:
    print(f"\n  ❌ FEATURES MANQUANTES : {manquantes}")