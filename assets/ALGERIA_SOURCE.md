# Algeria Wilayas & Communes — Data Source

## Source
- URL: https://raw.githubusercontent.com/wadiemendja/algeria-communes-wilayas/main/algeria-communes-58-wilayas.json
- Repository: https://github.com/wadiemendja/algeria-communes-wilayas
- File used: `algeria-communes-58-wilayas.json` (the repo also ships a 69-wilaya variant reflecting a newer 2026 reform; we deliberately used the 58-wilaya file since the task targets the 2019 administrative structure: Loi 19-12, wilayas 49-58 = Timimoun, Bordj Badji Mokhtar, Ouled Djellal, Béni Abbès, In Salah, In Guezzam, Touggourt, Djanet, El M'Ghair, El Meniaa).
- Date fetched: 2026-08-21

## Validation results
- Wilaya count: 58 (codes 01-58, no gaps, no duplicates)
- Total commune count: 1541 (within expected ~1400-1600 range; matches Algeria's official count of 1541 communes)
- Spot checks (all passed):
  - Code 16 = Alger (57 communes; includes "Bab El Oued", "Hydra", "Bir Mourad Rais")
  - Code 31 = Oran (26 communes; includes "Oran", "Bir El Djir", "Es Senia")
  - Code 25 = Constantine (12 communes)
  - Code 06 = Béjaïa (52 communes)
  - New wilayas (49-58) all present with plausible commune counts:
    - 49 Timimoun (10), 50 Bordj Badji Mokhtar (2), 51 Ouled Djellal (6),
      52 Béni Abbès (10), 53 In Salah (3), 54 In Guezzam (2),
      55 Touggourt (13), 56 Djanet (2), 57 El M'Ghair (8), 58 El Meniaa (3)

## Notes / caveats
- Names for wilayas 49-58 were normalized to the common French/Latin transliteration
  requested in the task spec (e.g. "El M'Ghair", "El Meniaa", "Béni Abbès") since the
  source used slightly different ASCII spellings in some cases (e.g. "El Meghaier").
  All other wilaya/commune names are used as provided by the source (ASCII/Latin
  transliteration fields: `wilaya_name_ascii`, `commune_name_ascii`).
- An earlier candidate source (`Kenandarabeh/algeria-wilayas-communes-2026`) was tried
  first but rejected: its `wilayas.json` contained 69 entries (codes 1-69), where codes
  59-69 were actually daïra/town names mislabeled as wilayas, and its `communes.json`
  had the commune-to-wilaya mapping garbled for wilayas 49-58 (e.g. wilaya 49
  "El M'ghair" was mapped to communes that actually belong to Timimoun). That source
  was discarded in favor of the wadiemendja dataset, which cleanly separates the
  58-wilaya (2019 reform) and 69-wilaya (2026 reform) structures into two files and
  passed all validation checks above.
- Daïra-level data (present in the source) was not carried into `algeria.js` since the
  output schema only requires wilaya code/name and a flat commune list.
