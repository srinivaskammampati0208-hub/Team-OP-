# HealAI local research demo

## Run locally

1. Install Python 3.12 (recommended by the model author).
2. From this folder, create a virtual environment and install the server dependencies:

   ```powershell
   py -3.12 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

   To also enable the optional wound-photo research model, install its larger
   dependencies separately:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements-ml.txt
   ```

3. Start the local website and inference server:

   ```powershell
   $env:DAILY_API_KEY = "your Daily API key"
   .\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8000
   ```

4. Open `http://127.0.0.1:8000/login.html`.
5. After logging in, use the 🎥 Video call link to create a private Daily room.

The Daily API key is read only by the local backend from `DAILY_API_KEY`; never
put it in JavaScript or commit it to source control. The room endpoint returns
separate one-hour patient and clinician invite links. Share the clinician invite
securely with the real clinician; the app does not notify or summon a doctor.
The listed doctor profiles are fictional demo data and are not verified or
connected to clinicians. Do not use this flow for emergency care.

The app starts without downloading the wound model; its first image analysis
downloads the model from Hugging Face and may take several minutes. The model
is approximately 327 MiB; the optional PyTorch dependencies also require
substantial disk space. Keep the server running while using the dashboard.
Uploaded images are sent only to this local server, processed in memory, and
not saved as image files. The model weights remain in the normal Hugging Face
cache.

## Experimental model

The dashboard uses
[`Hemg/Wound-Image-classification`](https://huggingface.co/Hemg/Wound-Image-classification),
a fine-tuned Vision Transformer with ten wound/image categories, pinned to
revision `2607ed76920be92c0ae7c41be05acfe6d8bf72a8`. The model card reports a
96.5% evaluation accuracy but does not describe the dataset, test-set
composition, or clinical validation. Treat all output as experimental research
labels, not diagnoses or treatment advice. The displayed model scores are not
calibrated probabilities.

Model card license: Apache-2.0. The existing on-device color/pixel overlay is a
separate heuristic visualization and is not the trained model's segmentation.

This prototype is not intended for clinical use. Do not use it to assess
urgency, make treatment decisions, or replace a qualified healthcare
professional.
