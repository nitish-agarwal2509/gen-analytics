from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcp_project_id: str = ""
    bq_dataset: str = ""
    google_application_credentials: str = ""
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_genai_use_vertexai: bool = False
    mysql_url: str = ""  # e.g. mysql+aiomysql://root@localhost:3306/gen_analytics
    mysql_test_url: str = ""  # e.g. mysql+aiomysql://root@localhost:3306/gen_analytics_test

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
