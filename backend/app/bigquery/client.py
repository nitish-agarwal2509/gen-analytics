from google.cloud import bigquery
from google.oauth2 import service_account

from app.config import settings


def get_client() -> bigquery.Client:
    if settings.google_application_credentials:
        credentials = service_account.Credentials.from_service_account_file(
            settings.google_application_credentials
        )
        return bigquery.Client(
            project=settings.gcp_project_id, credentials=credentials
        )
    return bigquery.Client(project=settings.gcp_project_id)


def list_datasets() -> list[str]:
    client = get_client()
    return [ds.dataset_id for ds in client.list_datasets()]


def list_tables(dataset: str) -> list[str]:
    client = get_client()
    dataset_ref = client.dataset(dataset)
    return [t.table_id for t in client.list_tables(dataset_ref)]
