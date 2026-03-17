from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_api_key: str = ""
    gcp_project_id: str = ""
    bq_dataset: str = ""
    google_application_credentials: str = ""
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_genai_use_vertexai: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
