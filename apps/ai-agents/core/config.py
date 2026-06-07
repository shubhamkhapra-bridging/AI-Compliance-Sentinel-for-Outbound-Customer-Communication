from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENV: str = "development"
    AI_AGENTS_API_KEY: str = "internal-secret"

    # LLM
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    DEFAULT_MODEL: str = "gpt-4o-mini"
    # Optional stronger model for design-heavy tasks (email generation + restyle).
    # Leave empty to use DEFAULT_MODEL. e.g. "gpt-4o" or "gemini-1.5-pro".
    GENERATION_MODEL: str = ""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_compliance"

    # Vector store
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""

    # Cache
    REDIS_URL: str = "redis://localhost:6379"

    # Email providers
    SENDGRID_API_KEY: str = ""
    AWS_SES_ACCESS_KEY: str = ""
    AWS_SES_SECRET_KEY: str = ""
    AWS_SES_REGION: str = "us-east-1"
    MAILGUN_API_KEY: str = ""
    MAILGUN_DOMAIN: str = ""

    # Kafka (opt-in)
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_PREFIX: str = "email-sentinel"

    # Observability
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    SENTRY_DSN: str = ""


settings = Settings()
