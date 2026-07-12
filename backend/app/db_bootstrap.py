from sqlalchemy import text

from app.database import engine


def ensure_schema() -> None:
    """Apply lightweight schema upgrades for existing local DBs."""
    # ENUM ADD VALUE should run outside a normal transaction on some Postgres versions
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(
            text(
                """
                DO $$ BEGIN
                    ALTER TYPE user_role ADD VALUE 'admin';
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                    WHEN undefined_object THEN NULL;
                END $$;
                """
            )
        )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
                """
            )
        )
