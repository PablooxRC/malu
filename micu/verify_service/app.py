import io
import os
import json
from PIL import Image, ImageChops, ImageStat
import pytesseract
import numpy as np
from flask import Flask, request, jsonify

try:
    import face_recognition
    FACE_AVAILABLE = True
except Exception:
    FACE_AVAILABLE = False

app = Flask(__name__)

# Helper: ELA score (simple heuristic)
def ela_score(pil_img, quality=90):
    try:
        orig_bytes = io.BytesIO()
        pil_img.save(orig_bytes, 'JPEG', quality=quality)
        orig_bytes.seek(0)
        compressed = Image.open(orig_bytes)
        diff = ImageChops.difference(pil_img.convert('RGB'), compressed.convert('RGB'))
        stat = ImageStat.Stat(diff)
        # Average of means
        mean_val = sum(stat.mean) / len(stat.mean)
        return float(mean_val)
    except Exception as e:
        return None

# Helper: simple OCR using pytesseract
def do_ocr(pil_img):
    try:
        # Prefer Spanish OCR for Bolivian IDs; fall back to English if not available.
        try:
            text = pytesseract.image_to_string(pil_img, lang='spa')
            # If result is very short, try English as fallback
            if not text or len(text.strip()) < 5:
                text_eng = pytesseract.image_to_string(pil_img, lang='eng')
                if text_eng and len(text_eng.strip()) > len(text.strip()):
                    text = text_eng
        except Exception:
            # In case 'spa' isn't available, fallback to English
            text = pytesseract.image_to_string(pil_img, lang='eng')
        return text
    except Exception:
        return ''

# Helper: face match (optional) - returns distance
def face_match(front_img_bytes, selfie_bytes):
    if not FACE_AVAILABLE:
        return None
    try:
        front = face_recognition.load_image_file(io.BytesIO(front_img_bytes))
        selfie = face_recognition.load_image_file(io.BytesIO(selfie_bytes))
        enc_front = face_recognition.face_encodings(front)
        enc_selfie = face_recognition.face_encodings(selfie)
        if not enc_front or not enc_selfie:
            return None
        d = face_recognition.face_distance([enc_front[0]], enc_selfie[0])[0]
        # convert distance to similarity score 0..1
        score = max(0.0, min(1.0, 1.0 - d))
        return float(score)
    except Exception:
        return None

@app.route('/verify', methods=['POST'])
def verify():
    # Expect files: idCardFront, idCardBack, optional selfie
    front = request.files.get('idCardFront')
    back = request.files.get('idCardBack')
    selfie = request.files.get('selfie')

    # Debug: if missing files, log what arrived to help diagnose client issues
    if not front or not back:
        try:
            present = list(request.files.keys())
            content_len = request.content_length
        except Exception:
            present = []
            content_len = None
        app.logger.warning('Missing idCardFront/idCardBack in /verify request. files=%s content_length=%s', present, content_len)
        return jsonify({
            'success': False,
            'message': 'Se requieren idCardFront e idCardBack',
            'received_files': present,
            'content_length': content_len
        }), 400

    # Read PIL images
    front_img = Image.open(front.stream).convert('RGB')
    back_img = Image.open(back.stream).convert('RGB')

    # OCR
    ocr_front = do_ocr(front_img)
    ocr_back = do_ocr(back_img)

    # Keep short excerpts for logs/debugging
    ocr_front_excerpt = (ocr_front or '').strip()[:300]
    ocr_back_excerpt = (ocr_back or '').strip()[:300]
    app.logger.info('OCR excerpts front=%s back=%s', ocr_front_excerpt.replace('\n',' '), ocr_back_excerpt.replace('\n',' '))

    # ELA
    ela_front = ela_score(front_img)
    ela_back = ela_score(back_img)

    # Face match (if selfie provided)
    face_score = None
    if selfie:
        selfie_bytes = selfie.read()
        # Need the raw bytes of front image as well
        front.stream.seek(0)
        front_bytes = front.stream.read()
        face_score = face_match(front_bytes, selfie_bytes)

    # Simple heuristics to determine verdict
    # If ELA values are very high -> suspicious
    suspicion = 0
    if ela_front and ela_front > 10:
        suspicion += 1
    if ela_back and ela_back > 10:
        suspicion += 1

    # If OCR found reasonable text (length > 10) -> plausible
    ocr_confidence = 0
    if ocr_front and len(ocr_front.strip()) > 10:
        ocr_confidence += 1
    if ocr_back and len(ocr_back.strip()) > 10:
        ocr_confidence += 1

    # Face influence
    face_influence = 0
    if face_score is not None:
        if face_score > 0.6:
            face_influence = 1
        elif face_score < 0.4:
            suspicion += 1

    # Compose score 0..1
    score = (ocr_confidence * 0.4) + (face_influence * 0.4) + (max(0, 2 - suspicion) / 2 * 0.2)
    score = max(0.0, min(1.0, score))

    if suspicion >= 2:
        verdict = 'probable_falso'
    elif score > 0.65:
        verdict = 'probable_real'
    else:
        verdict = 'manual_review'

    result = {
        'success': True,
        'verdict': verdict,
        'score': round(score, 3),
        'ela': {
            'front': ela_front,
            'back': ela_back
        },
        'ocr': {
            'front': ocr_front,
            'back': ocr_back,
            'excerpt': {
                'front': ocr_front_excerpt,
                'back': ocr_back_excerpt
            }
        },
        'face_score': face_score
    }

    return jsonify(result)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'success': True, 'status': 'ok' })

if __name__ == '__main__':
    port = int(os.environ.get('VERIFY_PORT', 5001))
    app.run(host='0.0.0.0', port=port)
