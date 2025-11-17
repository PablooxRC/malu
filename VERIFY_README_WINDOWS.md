PoC: Servicio de verificación de carnets (Windows)

Resumen
-------
Este repositorio incluye un microservicio PoC en `micu/verify_service` que realiza:
- OCR (pytesseract)
- ELA (Error Level Analysis) simple
- Comparación facial opcional (si subes `selfie`)

El backend Node.js ahora tiene la ruta:
- `POST /driver/verify-documents` (requiere autenticación)
  - form-data: `idCardFront` (file), `idCardBack` (file), `selfie` (file, opcional)
  - devuelve JSON con `verdict`, `score`, `ocr`, `ela`, `face_score` y se guarda en `Driver.verification`.

Instalación y ejecución (Windows PowerShell)
-------------------------------------------
1) Preparar microservicio (Python)
```powershell
cd e:\malu\micu\verify_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Asegúrate de instalar Tesseract OCR (https://github.com/tesseract-ocr/tesseract) y que tesseract.exe esté en PATH
$env:VERIFY_PORT=5001
python app.py
```
Esto levantará el servicio en `http://localhost:5001/verify`.

2) Ejecutar el backend Node.js
```powershell
cd e:\malu
# Si usas npm start: (el proyecto puede usar bin/www)
npm install
npm start
# O ejecuta directamente (si prefieres):
node app.js
```

3) Probar el endpoint desde PowerShell (ejemplo con curl integrado)
```powershell
curl -X POST "http://localhost:3000/driver/verify-documents" `
  -H "Authorization: Bearer <TOKEN>" `
  -F "idCardFront=@C:\path\to\front.jpg" `
  -F "idCardBack=@C:\path\to\back.jpg" `
  -F "selfie=@C:\path\to\selfie.jpg"
```
Reemplaza `<TOKEN>` con un token válido obtenido al hacer login.

Notas
-----
- El PoC usa heurísticos; no garantiza detección perfecta.
- Para producción considera proveedores especializados (Onfido, Veriff) o modelos entrenados.
- Si el microservicio está en otra máquina, configura la variable de entorno `VERIFY_SERVICE_URL` en el servidor Node antes de arrancarlo.

Problemas comunes
-----------------
- `pytesseract` requiere Tesseract OCR instalado en el sistema.
- `face_recognition` requiere dlib y compilaciones; en Windows puede ser complejo — si falla, la funcionalidad facial se ignorará y el servicio seguirá funcionando sin ella.

Si quieres, ahora implemento una vista de administración para revisar los resultados y aceptar/rechazar choferes automáticamente cuando `verdict === 'probable_real'`.