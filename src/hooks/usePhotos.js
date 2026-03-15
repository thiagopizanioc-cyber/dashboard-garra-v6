import { useState, useCallback } from 'react';

const KEY = (nome) => 'gp_' + String(nome).toUpperCase().trim().replace(/\s+/g, '_');

// Lê todas as fotos do localStorage no init
function loadAllPhotos() {
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('gp_')) result[k.slice(3)] = localStorage.getItem(k);
    }
  } catch (_) {}
  return result;
}

export function usePhotos() {
  const [photos, setPhotos] = useState(loadAllPhotos);

  const getPhoto = useCallback((nome) => {
    if (!nome) return null;
    return photos[String(nome).toUpperCase().trim().replace(/\s+/g, '_')] || null;
  }, [photos]);

  const savePhoto = useCallback((nome, dataUrl) => {
    const k = String(nome).toUpperCase().trim().replace(/\s+/g, '_');
    try {
      if (dataUrl) {
        localStorage.setItem('gp_' + k, dataUrl);
        setPhotos(p => ({ ...p, [k]: dataUrl }));
      } else {
        localStorage.removeItem('gp_' + k);
        setPhotos(p => { const n = { ...p }; delete n[k]; return n; });
      }
    } catch (e) {
      console.warn('Foto não salva (localStorage cheio?):', e.message);
    }
  }, []);

  return { getPhoto, savePhoto, photos };
}

// Resize image to max dimension before storing
export function resizeAndStore(file, maxPx = 220) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

// Prize storage (separate from photos)
const PRIZE_KEY = (pos) => 'gprize_' + pos;
export function getPrizeData(pos) {
  try { return JSON.parse(localStorage.getItem(PRIZE_KEY(pos))) || { img: null, txt: '', enabled: false }; }
  catch { return { img: null, txt: '', enabled: false }; }
}
export function savePrizeData(pos, data) {
  try { localStorage.setItem(PRIZE_KEY(pos), JSON.stringify(data)); } catch (_) {}
}
