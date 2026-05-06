/**
 * Foto de perfil — persistida em localStorage por username (data URL base64).
 * Backend ainda não tem campo de avatar; isso é o fallback até existir.
 */

const KEY = (username) => `liminai_pfp_${username || 'anon'}`;

export function getProfilePic(username) {
  try {
    return localStorage.getItem(KEY(username));
  } catch {
    return null;
  }
}

export function setProfilePic(username, dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(KEY(username), dataUrl);
    else localStorage.removeItem(KEY(username));
    window.dispatchEvent(new CustomEvent('liminai:pfp-change', { detail: { username } }));
  } catch (err) {
    console.error('falha ao salvar foto de perfil:', err);
  }
}

export function clearProfilePic(username) {
  setProfilePic(username, null);
}
