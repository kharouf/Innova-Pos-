/**
 * Google Workspace services (Google Drive & Gmail) API Integration Client for INNOVA-POS-PRO
 * Implements Google Drive file listing, uploads, folder discovery, and Gmail API message dispatches.
 */

/**
 * Interface representing a Google Drive Backup File metadata
 */
export interface DriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

/**
 * Searches for or creates a standard folder "INNOVA_POS_PRO" inside Google Drive
 * to house system backup files.
 */
export async function getOrCreateDriveFolder(token: string): Promise<string | null> {
  try {
    // 1. Search for folder first
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='INNOVA_POS_PRO' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!searchRes.ok) {
      throw new Error(`Folder lookup failed status: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Create folder if not found
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const metadata = {
      name: 'INNOVA_POS_PRO',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dossier officiel pour les sauvegardes automatiques de INNOVA POS PRO'
    };

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!createRes.ok) {
      throw new Error(`Folder creation failed status: ${createRes.status}`);
    }

    const createdFolder = await createRes.json();
    return createdFolder.id;
  } catch (error) {
    console.error('getOrCreateDriveFolder failed:', error);
    return null;
  }
}

/**
 * Uploads a JSON text backup of the POS database to a specified Google Drive folder.
 */
export async function uploadBackupToDrive(
  token: string,
  fileName: string,
  dbContent: string,
  folderId: string | null
): Promise<{ success: boolean; fileId?: string; sizeKB?: number; error?: string }> {
  try {
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: folderId ? [folderId] : undefined,
      description: 'Sauvegarde de la base de données INNOVA POS'
    };

    const boundary = 'innova_pos_multipart_boundary_xyz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      dbContent +
      closeDelim;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Drive file upload failed with status ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const bytes = result.size ? Number(result.size) : dbContent.length;
    const sizeKB = Math.round((bytes / 1024) * 100) / 100;

    return {
      success: true,
      fileId: result.id,
      sizeKB
    };
  } catch (err: any) {
    console.error('uploadBackupToDrive error:', err);
    return {
      success: false,
      error: err.message || String(err)
    };
  }
}

/**
 * Lists backups stored inside Drive (either in the folder or general search pattern).
 */
export async function listDriveBackups(token: string, folderId: string | null): Promise<DriveBackupFile[]> {
  try {
    let query = "name contains 'INNOVA_POS_Backup_' and trashed = false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const fields = 'files(id, name, mimeType, createdTime, size)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`List files query failed: ${response.status}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('listDriveBackups error:', error);
    return [];
  }
}

/**
 * Downloads a backup file's contents from Google Drive to restore it.
 */
export async function downloadDriveBackupContent(token: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`File download failed: ${response.status}`);
  }

  return await response.text();
}

/**
 * Deletes a backup from Google Drive
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.ok;
}

/**
 * Dispatches a HTML email safely using the Gmail API
 */
export async function sendEmailViaGmailAPI(
  token: string,
  recipient: string,
  subject: string,
  bodyHtml: string,
  senderName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const fromLine = senderName ? `From: "${senderName}" <me>` : 'From: me';
    const emailHeaders = [
      fromLine,
      `To: ${recipient}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      bodyHtml
    ];

    const emailRaw = emailHeaders.join('\r\n');
    
    // Base64Url encode standard raw email string
    const base64SafeEmail = btoa(unescape(encodeURIComponent(emailRaw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64SafeEmail
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail API dispatch failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id
    };
  } catch (error: any) {
    console.error('sendEmailViaGmailAPI failure:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}
