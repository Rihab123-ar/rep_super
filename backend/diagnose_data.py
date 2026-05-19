from utils.data_loader import DataLoader

print('=== DIAGNOSTIC DES DONNÉES ===')
dl = DataLoader()
loaded = dl.load_all()
print('load_all ->', loaded)
if not loaded:
    raise SystemExit('Échec du chargement des données')

sinistres = dl.get_sinistres()
contrats = dl.get_contrats()
tiers = dl.get_tiers()
print('sinistres shape:', None if sinistres is None else sinistres.shape)
print('contrats shape:', None if contrats is None else contrats.shape)
print('tiers shape:', None if tiers is None else tiers.shape)
print('---')
required_cols = ['is_fraud', 'fraud_label', 'target', 'y', 'label', 'statut_fraude']
key_cols = ['DATE_EFFET_CONTRAT', 'contrat_PRIME', 'contrat_CODE_CLIENT']
print('Label columns presence:')
for c in required_cols:
    if sinistres is not None and c in sinistres.columns:
        print(f'  - {c}: OK, unique values={sinistres[c].nunique()}, counts=\n{sinistres[c].value_counts(dropna=False).head(20)}')
    else:
        print(f'  - {c}: missing')
print('---')
print('Contract key columns presence:')
for c in key_cols:
    print(f'  - {c}:', 'OK' if sinistres is not None and c in sinistres.columns else 'missing')

if sinistres is not None:
    print('Total rows in sinistres:', len(sinistres))
    if 'is_fraud' in sinistres.columns:
        print('is_fraud null count:', sinistres['is_fraud'].isna().sum())
        if sinistres['is_fraud'].dtype == object:
            print('is_fraud sample types:', sinistres['is_fraud'].apply(lambda x: type(x).__name__).value_counts().to_dict())
