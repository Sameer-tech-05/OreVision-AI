# Data directory

This folder is intentionally empty in the delivered project.

No real, labelled iron-ore prospectivity dataset is bundled with this
academic mini-project, because such data is typically proprietary to
geological survey organizations or specific research studies.

To train a real model:

1. Obtain or construct a labelled CSV with columns:
   `magnetic_anomaly, gravity_anomaly, geological_indicator, distance_to_fault_km, remote_sensing_index, label`
2. Place it here (e.g. `data/iron_ore_training_data.csv`).
3. Run `python -m app.train --data data/iron_ore_training_data.csv` from `backend/`.

See the main `README.md` "Model setup" and "Dataset requirements" sections for details.
