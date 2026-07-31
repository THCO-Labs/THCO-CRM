import os
import io
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SUPPORTED_CV_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


def get_drive_service():
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build

    creds_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if creds_json:
        import json
        creds_dict = json.loads(creds_json)
        creds = Credentials.from_service_account_info(
            creds_dict,
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
    else:
        creds_file = os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE', '')
        if creds_file:
            creds = Credentials.from_service_account_file(
                creds_file,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
        else:
            return None

    return build('drive', 'v3', credentials=creds)


def list_cv_files(folder_id: str = None, query: str = None, page_size: int = 50, recursive: bool = True) -> List[Dict[str, Any]]:
    service = get_drive_service()
    if not service:
        logger.warning("Google Drive not configured")
        return []

    results = []
    folders_to_scan = [folder_id] if folder_id else []

    while folders_to_scan:
        current_folder = folders_to_scan.pop(0)
        page_token = None

        while len(results) < page_size * 10:
            q_parts = ["trashed = false", f"'{current_folder}' in parents"]
            if query:
                q_parts.append(f"name contains '{query.replace('\'', '\\\'')}'")
            q = " and ".join(q_parts)

            resp = service.files().list(
                q=q,
                pageSize=min(page_size * 2, 1000),
                pageToken=page_token,
                fields="nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)",
                orderBy="modifiedTime desc"
            ).execute()

            for f in resp.get('files', []):
                mime = f.get('mimeType', '')
                if mime == 'application/vnd.google-apps.folder':
                    if recursive:
                        folders_to_scan.append(f['id'])
                    continue

                name = f.get('name', '')
                ext = os.path.splitext(name)[1].lower()
                if ext in SUPPORTED_CV_EXTENSIONS:
                    results.append({
                        "id": f['id'],
                        "name": name,
                        "mime_type": mime,
                        "size": int(f.get('size', 0)),
                        "created": f.get('createdTime', ''),
                        "modified": f.get('modifiedTime', ''),
                        "web_view_link": f.get('webViewLink', ''),
                        "folder_id": current_folder,
                    })

            page_token = resp.get('nextPageToken')
            if not page_token:
                break

    return results


def download_file(file_id: str) -> Optional[bytes]:
    service = get_drive_service()
    if not service:
        return None

    try:
        request = service.files().get_media(fileId=file_id)
        file_bytes = io.BytesIO()
        downloader = request.execute()
        file_bytes.write(downloader)
        return file_bytes.getvalue()
    except Exception as e:
        logger.error(f"Failed to download file {file_id}: {e}")
        return None


def download_file_by_name(file_id: str) -> tuple:
    service = get_drive_service()
    if not service:
        return None, None

    try:
        meta = service.files().get(fileId=file_id, fields="name").execute()
        request = service.files().get_media(fileId=file_id)
        file_bytes = io.BytesIO()
        downloader = request.execute()
        file_bytes.write(downloader)
        return file_bytes.getvalue(), meta.get('name', str(file_id))
    except Exception as e:
        logger.error(f"Failed to download file {file_id}: {e}")
        return None, None
