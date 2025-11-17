PoC microservicio de verificación de carnets

Requisitos (Windows):
- Instalar Tesseract OCR y agregarlo al PATH: https://github.com/tesseract-ocr/tesseract
- Python 3.10+ recomendado

Instalar idioma español para Tesseract (recomendado):
- Descarga `spa.traineddata` desde el repositorio tessdata: https://github.com/tesseract-ocr/tessdata
- Copia `spa.traineddata` en la carpeta `tessdata` de tu instalación de Tesseract. En Windows la ruta típica es:
  `C:\Program Files\Tesseract-OCR\tessdata\spa.traineddata`
- Verifica los idiomas instalados con:
```powershell
tesseract --list-langs
```
- Si `spa` aparece en la lista, la microservicio usará español para OCR automáticamente.

Instalación:
```powershell
cd e:\malu\micu\verify_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Ejecutar:
```powershell
.\.venv\Scripts\Activate.ps1
$env:VERIFY_PORT=5001
python app.py
```

Endpoints:
- POST /verify
  - form-data: `idCardFront` (file), `idCardBack` (file), `selfie` (file, opcional)
  - response: JSON con `verdict`, `score`, `ocr`, `ela`, `face_score` (si está disponible)
- GET /health
  - response: `{ "success": true, "status": "ok" }`

Notas importantes:
- Este es un PoC que usa heurísticos: ELA (Error Level Analysis) + OCR (pytesseract). La verificación facial está deshabilitada por defecto en esta distribución para evitar dependencias que requieren compilar `dlib` en Windows.
- Si quieres habilitar la verificación facial (opcional), instala `dlib` y `face_recognition` manualmente. En Windows esto suele requerir las "Build Tools" de Visual Studio y CMake, o usar `pipwin` para ruedas precompiladas.

Cómo reactivar la verificación facial (opcional):
1. Instala CMake y Visual Studio Build Tools (o usa `pipwin` para ruedas precompiladas).
2. En el entorno virtual ejecuta:
```powershell
pip install pipwin
pipwin install dlib
pipwin install face_recognition
```
3. Reinicia el servicio Python (si estaba corriendo). Si prefieres compilar desde fuentes, instala CMake y las Visual Studio Build Tools y luego `pip install face_recognition`.

Limitaciones y recomendaciones:
- Sin verificación facial la PoC seguirá funcionando con OCR+ELA, pero la robustez frente a falsificaciones basadas en rostros será menor.
- Para producción considera proveedores especializados (Onfido, Veriff) o modelos entrenados en datasets forense.

Si necesitas, puedo guiarte paso a paso para instalar `face_recognition` en tu máquina (Opción B/C), o mantenerlo así y continuar con la integración asincrónica (cola) para tolerar fallos del microservicio.

---

Última nota: la intención de quitar `face_recognition` del `requirements.txt` es permitir que el microservicio se instale y arranque en Windows sin requerir compilación nativa. Si ya intentaste correr `pip install -r requirements.txt` y falló con un error de `dlib` / CMake, este README explica por qué y cómo proceder.
PoC microservicio de verificación de carnets

Requisitos (Windows):
- Instalar Tesseract OCR y agregarlo al PATH: https://github.com/tesseract-ocr/tesseract
- Python 3.10+ recomendado

Instalación:
```powershell
cd e:\malu\micu\verify_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Ejecutar:
```powershell
.\.venv\Scripts\Activate.ps1
$env:VERIFY_PORT=5001
python app.py
```

Endpoints:
- POST /verify
  - form-data: idCardFront (file), idCardBack (file), selfie (file, opcional)
  - response: JSON con `verdict`, `score`, `ocr`, `ela`, `face_score`

Notas:
- Este es un PoC con heurísticos: ELA + OCR + comparación facial opcional.
- Para mejorar en producción, se recomienda usar modelos entrenados para forensics o proveedores comerciales (Onfido, Veriff, AWS Rekognition, Azure ID verification).