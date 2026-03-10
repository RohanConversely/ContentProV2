from app.models.asset import Asset
from app.services.storage import storage_service


def generate_url(asset: Asset) -> str | None:
    if asset.is_deleted:
        return None
    url, _ = storage_service.get_presigned_url(asset.storage_key)
    return url
