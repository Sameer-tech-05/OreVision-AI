# Models directory

No trained model file is bundled with this project (see the project
README's "Limitations" section for why). At startup, `app/model.py`
looks here for `iron_ore_xgb_model.joblib`.

- If the file is missing, the API runs in **demo mode**: every prediction
  response is labeled `model_mode: "demo"` and uses a documented,
  non-ML placeholder heuristic instead of a fabricated model score.
- Run `python -m app.train --data <your_dataset.csv>` (see `backend/app/train.py`
  and `backend/data/README.md`) to produce a real `iron_ore_xgb_model.joblib`
  here, after which the API automatically switches to `model_mode: "trained"`
  on restart.
