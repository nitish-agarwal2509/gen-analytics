from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_api_key: str = ""
    gcp_project_id: str = ""
    bq_dataset: str = ""
    google_application_credentials: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
