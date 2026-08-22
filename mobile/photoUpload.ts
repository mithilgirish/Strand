import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { buildJsonAuthHeaders } from './apiAuth';
import { API_BASE_URL } from './config';

/**
 * Upload a local device image to Supabase Storage ('inspector_photos' bucket).
 *
 * Sends base64 as JSON to /inspector/upload-photo-base64 which uses backend
 * service role key — bypasses React Native FormData limitations AND Supabase RLS.
 */
export async function uploadPhotoAsync(uri: string, base64?: string | null): Promise<string | null> {
  if (!uri) return null;

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  const rawFilename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(rawFilename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // Strategy 1: POST JSON with base64 to backend (no FormData, uses service role)
  if (base64) {
    try {
      const headers = await buildJsonAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/inspector/upload-photo-base64`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64_data: base64,
          content_type: contentType,
          filename: rawFilename,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.photo_url) {
          return data.photo_url;
        }
      } else {
        const errText = await response.text();
        console.warn('Base64 photo upload failed:', response.status, errText);
      }
    } catch (err) {
      console.warn('Base64 backend photo upload error:', err);
    }
  }

  // Strategy 2: Fallback — FormData (works on web/simulator, breaks on Android device)
  try {
    const cleanFilename = `ncr_${Date.now()}_${rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: cleanFilename,
      type: contentType,
    } as any);

    const headers = await buildJsonAuthHeaders();
    delete (headers as any)['Content-Type'];

    const response = await fetch(`${API_BASE_URL}/inspector/upload-photo`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.photo_url || null;
    }
  } catch (err) {
    console.warn('FormData backend photo upload failed:', err);
  }

  return uri;
}

/**
 * Upload a user avatar to Supabase Storage ('avatars' bucket).
 *
 * Sends base64 as JSON to /user/upload-avatar-base64 which uses backend
 * service role key — bypasses React Native FormData limitations AND Supabase RLS.
 */
export async function uploadUserAvatarAsync(
  uri: string,
  userId: string,
  base64?: string | null
): Promise<string | null> {
  if (!uri) return null;

  const match = /\.(\w+)$/.exec(uri);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // Strategy 1: POST JSON with base64 to backend (no FormData, no RLS issues)
  if (base64) {
    try {
      const headers = await buildJsonAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/user/upload-avatar-base64`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64_data: base64,
          content_type: contentType,
          user_id: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.avatar_url) {
          return data.avatar_url;
        }
      } else {
        const errText = await response.text();
        console.warn('Base64 avatar upload failed:', response.status, errText);
      }
    } catch (backendErr) {
      console.warn('Base64 backend avatar upload error:', backendErr);
    }
  }

  // Strategy 2: Direct Supabase ArrayBuffer upload (fallback, may fail on Android with RLS)
  try {
    let fileBody: ArrayBuffer;

    if (base64) {
      fileBody = decode(base64);
    } else {
      const blobResp = await fetch(uri);
      const blob = await blobResp.blob();
      fileBody = await blob.arrayBuffer();
    }

    const filename = `avatar_${userId}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filename, fileBody, { contentType, upsert: true });

    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
      return publicUrl || null;
    } else if (error) {
      console.warn('Direct avatar upload error:', error);
    }
  } catch (err) {
    console.warn('Failed to upload user avatar directly:', err);
  }

  return null;
}
